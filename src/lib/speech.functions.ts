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
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
      return { ok: false as const, reason: "unconfigured" as const, message: "Premium voice is not configured." };
    }

    // Hard input cap — long lines are trimmed, never sent whole.
    const text = data.text.slice(0, aiLimits.maxSpeechChars);
    const persona = voiceById(data.voiceId as never);
    const premium = persona.tts !== "alloy";
    const action = premium ? "speech_premium" : "speech";
    const cost = creditCost(action, text.length);
    const model = "openai/gpt-4o-mini-tts";

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
      // The gateway returns no per-call price, so this is our published
      // assumption and is labelled estimated everywhere it is shown.
      providerCostUsd: () => estimatedTtsCostUsd(text.length),
      run: async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              input: text,
              voice: persona.tts,
              instructions: persona.direction,
              speed: persona.speed,
              response_format: "mp3",
            }),
            signal: controller.signal,
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error(`TTS failed [${res.status}]: ${body}`);
            throw Object.assign(new Error("tts_failed"), { status: res.status });
          }
          const buf = new Uint8Array(await res.arrayBuffer());
          let binary = "";
          for (let i = 0; i < buf.length; i += 0x8000) {
            binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          }
          return `data:audio/mpeg;base64,${btoa(binary)}`;
        } finally {
          clearTimeout(timer);
        }
      },
    });

    if (!result.ok) {
      if (result.reason === "provider") {
        const status = result.status ?? 0;
        const message =
          status === 402
            ? "The voice service is out of credit on this account."
            : status === 429
              ? "Voice service is busy — try that again in a moment."
              : "Voice service could not speak that line.";
        return { ok: false as const, reason: "provider" as const, message, status };
      }
      return {
        ok: false as const,
        reason: result.reason,
        message: result.message,
        needed: result.needed ?? cost,
      };
    }

    cacheSet(ck, result.value);
    return { ok: true as const, audio: result.value, charged: result.charged, cached: false, saved: 0 };
  });

/** Costs shown to the driver BEFORE anything is spoken. */
export const quoteSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ chars: z.number().int().min(0).max(5000) }).parse(d))
  .handler(({ data }) => ({
    standard: creditCost("speech", data.chars),
    premium: creditCost("speech_premium", data.chars),
    assumptionsUpdated: providerCostAssumptions.updated,
  }));
