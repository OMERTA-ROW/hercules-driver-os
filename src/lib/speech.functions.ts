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
          if (err instanceof ElevenLabsError) throw err;
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
        // Whatever went wrong at the provider, the hold was returned in full.
        return {
          ok: false as const,
          reason: "provider" as const,
          message: describeElevenFailure(status, "").message,
          status,
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
