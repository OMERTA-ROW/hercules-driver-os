import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { voiceById, voiceOptions } from "@/data/voices";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiLimits,
  creditCost,
  estimatedTtsCostUsd,
  providerCostAssumptions,
} from "@/data/ai-credits";
import {
  cacheGet,
  cacheKey,
  cacheSet,
  gateCheck,
  rateLimit,
  requestIdentity,
  runMetered,
  walletQuality,
} from "@/lib/ai-meter.server";

/**
 * PREMIUM SPEECH — authenticated, rate limited, credit metered.
 *
 * De-duplication, the credit hold, the provider call and settlement are ONE
 * operation (`runMetered`), so two identical concurrent requests produce one
 * provider call and one debit. Eco quality is enforced here on the server: no
 * paid call happens at all, whatever the caller sends. If the provider fails,
 * the hold is returned in full and the caller falls back to the device's own
 * free voice, so the driver always hears the line.
 */
export const speakLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        voiceId: z.enum(voiceOptions.map((v) => v.id) as [string, ...string[]]),
        text: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { ELEVEN_MODEL } = await import("@/data/voices");
    const { elevenLabsConfigured, elevenSpeak, ElevenLabsError } = await import(
      "@/lib/elevenlabs.server"
    );

    if (!elevenLabsConfigured()) {
      return {
        ok: false as const,
        reason: "unconfigured" as const,
        message:
          "The real AI voice service isn't connected to this app yet, so your device spoke this line free.",
      };
    }

    // Hard input cap — long lines are trimmed, never sent whole.
    const text = data.text.slice(0, aiLimits.maxSpeechChars);
    const persona = voiceById(data.voiceId as never);
    const action = "speech_premium";
    const cost = creditCost(action, text.length);
    const model = ELEVEN_MODEL;

    // Eco: the account has asked for zero-cost speech. Refuse before any spend.
    if ((await walletQuality(context.userId)) === "eco") {
      return {
        ok: false as const,
        reason: "eco" as const,
        message: "Eco voice is on — this line is spoken by your device at no credit cost.",
      };
    }

    const limited = rateLimit(context.userId);
    if (!limited.ok) {
      return { ok: false as const, reason: "rate_limited" as const, message: limited.message };
    }

    // Even a cached clip is the PAID voice, so the same gate applies: an account
    // whose plan has lapsed, or which is paused at its daily or weekly cap, does
    // not keep hearing premium speech for free out of the cache.
    const gate = await gateCheck(context.userId, cost);
    if (gate.outcome !== "ok") {
      if (gate.outcome === "no_subscription") {
        return {
          ok: false as const,
          reason: "no_subscription" as const,
          message:
            "The real AI voice needs a monthly AI plan on this account. Your device's own voice keeps working, free.",
        };
      }
      if (gate.outcome === "no_allowance_config") {
        return {
          ok: false as const,
          reason: "no_allowance_config" as const,
          message:
            "This plan's daily and weekly allowance is not set up, so paid voice is held back rather than run without a limit. Your device's own voice is speaking, free.",
        };
      }
      if (gate.outcome === "daily_limit" || gate.outcome === "weekly_limit") {
        return {
          ok: false as const,
          reason: gate.outcome,
          message: allowancePausedLine(
            gate.outcome === "daily_limit" ? "daily" : "weekly",
            gate.resets_at ?? null,
          ),
          resetsAt: gate.resets_at ?? null,
        };
      }
      return {
        ok: false as const,
        reason: "error" as const,
        message: "Could not check this account's AI voice allowance, so nothing was charged.",
      };
    }

    const ck = cacheKey(context.userId, [model, data.voiceId, text]);

    // Repeat of a line this same account just heard — free, nothing reserved.
    const cached = cacheGet(ck);
    if (cached) {
      return { ok: true as const, audio: cached, charged: 0, cached: true, saved: cost };
    }

    const identity = await requestIdentity(context.userId, [model, data.voiceId, text]);

    const result = await runMetered<string>({
      userId: context.userId,
      action,
      cost,
      identity,
      model,
      costBasis: "estimated",
      // The provider returns no per-call price, so this is our published
      // assumption and is labelled estimated everywhere it is shown.
      providerCostUsd: () => estimatedTtsCostUsd(text.length),
      run: async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        try {
          return await elevenSpeak(persona, text, { signal: controller.signal });
        } catch (err) {
          if (err instanceof ElevenLabsError) {
            // Keep the provider's own explanation (quota, refusal, busy) so the
            // driver is told the real reason rather than a generic one.
            failure = err.failure;
            throw err;
          }
          throw Object.assign(new Error("tts_failed"), { status: 0 });
        } finally {
          clearTimeout(timer);
        }
      },
    });


    if (!result.ok) {
      if (result.reason === "provider") {
        const status = result.status ?? 0;
        const { describeElevenFailure } = await import("@/lib/elevenlabs.server");
        const base = failure?.message ?? describeElevenFailure(status, "").message;
        // Only say the hold came back when the release was actually recorded.
        const message = result.refunded
          ? base
          : `${base.replace(/ You weren't charged\.$/, "")} Your credit hold could not be released just now; it is reconciled automatically and no charge is settled for this line.`;
        return {
          ok: false as const,
          reason: "provider" as const,
          message,
          status,
          quota: failure?.quota === true,
          refunded: result.refunded === true,
        };
      }

      return {
        ok: false as const,
        reason: result.reason,
        message: result.message,
        needed: result.needed ?? cost,
      };
    }

    cacheSet(ck, result.value);
    return {
      ok: true as const,
      audio: result.value,
      charged: result.charged,
      cached: false,
      saved: 0,
    };
  });

/** Costs shown to the driver BEFORE anything is spoken. */
export const quoteSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ chars: z.number().int().min(0).max(5000) }).parse(d))
  .handler(({ data }) => ({
    standard: creditCost("speech", data.chars),
    premium: creditCost("speech_premium", data.chars),
    assumptionsUpdated: providerCostAssumptions.updated,
  }));

/**
 * VOICE PROVIDER STATUS — what is really connected, said plainly.
 *
 * When the key is present this reads the live voice library and reports, per
 * persona, whether this account is licensed for that stock voice. When it is
 * absent it says so; it never guesses and never claims live speech.
 */
export const voiceProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { voiceOptions: personas, ELEVEN_MODEL, PREVIEW_CLIP_MODEL } = await import(
      "@/data/voices"
    );
    const { elevenLabsConfigured, verifyElevenVoices } = await import("@/lib/elevenlabs.server");

    const shared = {
      provider: "ElevenLabs" as const,
      model: ELEVEN_MODEL,
      previewClipModel: PREVIEW_CLIP_MODEL,
    };

    const checkedAt = new Date().toISOString();

    if (!elevenLabsConfigured()) {
      // Logged so the true state is recorded, never inferred from the screen.
      console.info(`[voice] provider=ElevenLabs connected=false reason=no_key at=${checkedAt}`);
      return {
        ...shared,
        checkedAt,
        connected: false as const,
        message:
          "The real AI voice service isn't connected yet. Every line is spoken by your device, free, until it is.",
        voices: [],
      };
    }

    const check = await verifyElevenVoices(personas);
    if (!check.ok) {
      console.info(
        `[voice] provider=ElevenLabs connected=false status=${check.status} at=${checkedAt}`,
      );
      return {
        ...shared,
        checkedAt,
        connected: false as const,
        message: check.message,
        voices: [],
      };
    }

    const missing = check.voices.filter((v) => !v.available);
    console.info(
      `[voice] provider=ElevenLabs connected=true model=${ELEVEN_MODEL} voices=${check.voices.length} unlicensed=${missing.length} at=${checkedAt}`,
    );
    return {
      ...shared,
      checkedAt,
      connected: true as const,
      message: missing.length
        ? `Connected, but ${missing.length} character${missing.length === 1 ? "" : "s"} has no licensed voice on this account and falls back to your device.`
        : "Connected. Every character has a licensed voice on this account.",
      voices: check.voices,
    };
  });
