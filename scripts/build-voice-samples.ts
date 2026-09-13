/**
 * ONE-OFF: renders each persona's picker sample line to a static clip in
 * public/voice-samples/. These are identical for everyone — no driver data, no
 * per-account audio — so new drivers hear the real neural characters without a
 * paid call and without spending their credits. Re-run only if a sample line,
 * voice or direction changes:  bun scripts/build-voice-samples.ts
 */
import { writeFile } from "node:fs/promises";
import { voiceOptions, TTS_MODEL } from "../src/data/voices";

const key = process.env["LOVABLE_API_KEY"];
if (!key) throw new Error("LOVABLE_API_KEY is required to render the samples");

for (const v of voiceOptions) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: v.sample,
      voice: v.tts,
      instructions: v.direction,
      speed: v.speed,
      response_format: "mp3",
    }),
  });
  if (!res.ok) throw new Error(`${v.id}: ${res.status} ${await res.text().catch(() => "")}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await writeFile(`public/voice-samples/${v.id}.mp3`, bytes);
  console.log(`${v.id} (${v.tts}) ${bytes.length} bytes`);
}
