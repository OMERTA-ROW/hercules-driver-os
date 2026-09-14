/**
 * ONE-OFF: renders each persona's picker sample line to a static clip in
 * public/voice-samples/ using the SAME ElevenLabs voice the driver hears on the
 * road. These clips are identical for everyone — no driver data, no per-account
 * audio — so new drivers hear the real characters without a paid call and
 * without spending their credits.
 *
 * Re-run only if a sample line, voice or delivery changes:
 *   bun scripts/build-voice-samples.ts
 */
import { writeFile } from "node:fs/promises";
import { voiceOptions, ELEVEN_MODEL } from "../src/data/voices";
import { elevenSettings, ELEVEN_API } from "../src/lib/elevenlabs.server";

const key = process.env["ELEVENLABS_API_KEY"];
if (!key) throw new Error("ELEVENLABS_API_KEY is required to render the samples");

for (const v of voiceOptions) {
  const res = await fetch(
    `${ELEVEN_API}/v1/text-to-speech/${v.eleven}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: v.sample,
        model_id: ELEVEN_MODEL,
        voice_settings: elevenSettings(v),
      }),
    },
  );
  if (!res.ok) throw new Error(`${v.id}: ${res.status} ${await res.text().catch(() => "")}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await writeFile(`public/voice-samples/${v.id}.mp3`, bytes);
  console.log(`${v.id} (${v.elevenName}) ${bytes.length} bytes`);
}
