# Live voice provider — ElevenLabs

## What speaks

| Surface | Provider | Cost |
| --- | --- | --- |
| Live spoken lines during a drive | ElevenLabs `eleven_flash_v2_5`, licensed stock voices | AI credits, metered |
| Picker Play buttons | static clips in `public/voice-samples/`, recorded earlier with `openai/gpt-4o-mini-tts` | free, no call |
| Any failure or gate | the device's own built-in voice | free |

The preview clips are labelled in the picker as recorded previews from an
earlier voice service, not as the live voice. They are only re-rendered with
ElevenLabs once credentials exist (`scripts/build-voice-samples.ts` equivalent
for the new provider); until then the label stays honest.

## Key handling

`ELEVENLABS_API_KEY` comes from the native ElevenLabs connector and is read
**inside handlers only**, in `src/lib/elevenlabs.server.ts`. It is never
mirrored into a `VITE_` variable, never sent to the browser, and never placed in
a URL. ElevenLabs is called directly (`https://api.elevenlabs.io`) with the
`xi-api-key` header — it does not use the connector gateway.

## Persona → licensed stock voice

Five male, four female, one stock voice each, no cloning:

| Persona | Stock voice |
| --- | --- |
| Hercules | George |
| Zeus | Bill |
| Ares | Callum |
| Atlas | Daniel |
| Apollo | Liam |
| Athena | Sarah |
| Medusa | Matilda |
| Hera | Alice |
| Artemis | Lily |

Delivery per persona is set with ElevenLabs voice settings (`stability`,
`style`, `similarity_boost`, `speed` clamped to the provider's 0.7–1.2 window).

`voiceProviderStatus` (authenticated) reads the live `/v1/voices` library and
reports, per persona, whether this account is licensed for that voice. The
status card in the voice picker shows exactly that — it never claims a live
connection it has not confirmed.

## Gates and refunds (unchanged)

Speech still runs through `runMetered`: rate limit → per-account cache →
atomic credit hold → provider call → commit or refund. Eco quality, no
subscription, missing allowance config, daily and weekly caps are all decided
server-side before any paid call. On a provider failure — 401 credentials, 401
quota, 429, 4xx or timeout — the hold is refunded in full and the driver hears
the device voice with a line that says they were not charged.

Catalogue is unchanged: Assist $9/150, Pro $29/600, Max $100/3000; caps 10/25/110
per day and 40/150/750 per week; America/New_York midnight daily and Saturday
weekly resets; subscriber-only top-ups 10/$3, 50/$15, 100/$30.

## Verification status

- Adapter, mapping, error translation, licence validation and encoding are
  covered by `src/lib/elevenlabs.test.ts` with a stubbed `fetch` — no credentials
  needed.
- **Live audio verification is blocked**: no ElevenLabs connection exists on
  this project yet, so no real male/female clip has been generated. Once the
  connection is linked, run the status card and one short sample per gender.
