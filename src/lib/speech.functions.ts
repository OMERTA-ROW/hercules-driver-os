import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { voiceById, voiceOptions } from "@/data/voices";

/**
 * Turns a HERCULES line into real speech in the chosen persona's character.
 * Runs server-side so the gateway key never reaches the cab tablet.
 */
export const speakLine = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        voiceId: z.enum(voiceOptions.map((v) => v.id) as [string, ...string[]]),
        text: z.string().min(1).max(1200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, status: 401, message: "Voice service is not configured." };

    const persona = voiceById(data.voiceId as never);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: persona.tts,
        instructions: persona.direction,
        speed: persona.speed,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`TTS failed [${res.status}]: ${body}`);
      const message =
        res.status === 402
          ? "The voice service is out of credit on this account."
          : res.status === 429
            ? "Voice service is busy — try that again in a moment."
            : "Voice service could not speak that line.";
      return { ok: false as const, status: res.status, message };
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    return { ok: true as const, audio: `data:audio/mpeg;base64,${btoa(binary)}` };
  });
