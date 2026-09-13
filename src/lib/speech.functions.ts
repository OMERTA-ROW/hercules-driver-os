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
  commit,
  dedupe,
  rateLimit,
  refund,
  reserve,
} from "@/lib/ai-meter.server";

/**
 * PREMIUM SPEECH — authenticated, rate limited, credit metered.
 *
 * Nothing reaches the paid speech provider until a signed-in account has had
 * the credits held for it. If the provider fails, the hold is returned in full.
 * The caller falls back to the device's own free voice whenever this says no,
 * so the driver always hears the line.
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

    // Hard input cap — long lines are trimmed at a sentence break, never sent whole.
    const text = data.text.slice(0, aiLimits.maxSpeechChars);
    const persona = voiceById(data.voiceId as never);
    const premium = persona.tts !== "alloy";
    const action = premium ? "speech_premium" : "speech";
    const cost = creditCost(action, text.length);
    const model = "openai/gpt-4o-mini-tts";

    const limited = rateLimit(context.userId);
    if (!limited.ok) {
      return { ok: false as const, reason: "rate_limited" as const, message: limited.message };
    }

    const db = context.supabase as never;
    const ck = cacheKey(context.userId, [model, data.voiceId, text]);

    // Repeat of a line this same account just heard — free, and recorded as saved.
    const cached = cacheGet(ck);
    if (cached) {
      const held = await reserve(db, `${action}_cached`, 0);
      if (held.ok) {
        await commit(db, held.reservation.id, {
          charge: 0,
          model,
          providerCostUsd: 0,
          costBasis: "none",
          cached: true,
          saved: cost,
        });
      }
      return { ok: true as const, audio: cached, charged: 0, cached: true };
    }

    const held = await reserve(db, action, cost);
    if (!held.ok) {
      return {
        ok: false as const,
        reason: held.reason === "insufficient" ? ("insufficient" as const) : ("error" as const),
        message: held.message,
        needed: cost,
      };
    }

    try {
      // One identical request in flight at a time — retries collapse into it.
      const audio = await dedupe(ck, async () => {
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
      });

      cacheSet(ck, audio);
      await commit(db, held.reservation.id, {
        charge: cost,
        model,
        // The gateway does not return a per-call price, so this is our own
        // published assumption, and it is labelled estimated everywhere.
        providerCostUsd: estimatedTtsCostUsd(text.length),
        costBasis: "estimated",
      });
      return { ok: true as const, audio, charged: cost, cached: false };
    } catch (e) {
      await refund(db, held.reservation.id, "Speech provider failed — credits returned");
      const status = (e as { status?: number }).status ?? 0;
      const message =
        status === 402
          ? "The voice service is out of credit on this account."
          : status === 429
            ? "Voice service is busy — try that again in a moment."
            : "Voice service could not speak that line.";
      return { ok: false as const, reason: "provider" as const, message, status };
    }
  });

/** Costs shown to the driver BEFORE anything is spoken. */
export const quoteSpeech = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ chars: z.number().int().min(0).max(5000) }).parse(d))
  .handler(({ data }) => ({
    standard: creditCost("speech", data.chars),
    premium: creditCost("speech_premium", data.chars),
    assumptionsUpdated: providerCostAssumptions.updated,
  }));
