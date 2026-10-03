/**
 * ONE-OFF: renders each persona's picker sample line to a static clip in
 * public/voice-samples/ using the SAME ElevenLabs request body (model, voice,
 * settings, text cleanup) the driver hears on the road. Identical for everyone,
 * no driver data. Re-run whenever VOICE_SETTINGS_VERSION changes:
 *   bun scripts/build-voice-samples.ts
 */
import { writeFile } from "node:fs/promises";
import { voiceOptions, VOICE_SETTINGS_VERSION } from "../src/data/voices";
import { elevenRequestBody, ELEVEN_API } from "../src/lib/elevenlabs.server";

const key = process.env["ELEVENLABS_API_KEY"];
if (!key) throw new Error("ELEVENLABS_API_KEY is required to render the samples");

for (const v of voiceOptions) {
  const t0 = Date.now();
  const res = await fetch(
    `${ELEVEN_API}/v1/text-to-speech/${v.eleven}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(elevenRequestBody(v, v.sample)),
    },
  );
  if (!res.ok) throw new Error(`${v.id}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await writeFile(`public/voice-samples/${v.id}.mp3`, bytes);
  console.log(`${v.id} (${v.elevenName}, ${v.gender}) ${bytes.length}B ${Date.now() - t0}ms`);
}
await writeFile("public/voice-samples/VERSION", `${VOICE_SETTINGS_VERSION}\n`);
