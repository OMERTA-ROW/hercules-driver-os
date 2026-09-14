# Live voice provider — ElevenLabs

## What speaks

| Surface | Provider | Cost |
| --- | --- | --- |
| Live spoken lines during a drive | ElevenLabs `eleven_flash_v2_5`, provider stock voices | AI credits, metered |
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

## Persona → provider stock voice

Five male, four female, one stock voice each, no cloning:

| Persona | Character | Stock voice | Voice id |
| --- | --- | --- | --- |
| Hercules | grounded, warm bass | George | `JBFqnCBsd6RMkjVDRZzb` |
| Zeus | resonant, commanding | Bill | `pqHfZKP75CvOlQylNhV4` |
| Ares | firm, energetic | Callum | `N2lVS1w4EtoT3dr4eOWO` |
| Atlas | deep, steady | Daniel | `onwK4e9ZLuTAKqWW03F9` |
| Apollo | bright, reassuring | Liam | `TX3LPaxmHKxFdv7VOQHJ` |
| Athena | clear, composed | Sarah | `EXAVITQu4vr4xnSDxMaL` |
| Medusa | low, smoky, calm | Matilda | `XrExE9yKIg1WjnnlVkGX` |
| Hera | warm, authoritative | Alice | `Xb7hH8MSUJpSbSDYk0k2` |
| Artemis | crisp, alert | Lily | `pFZP5JQG7iQjIQuC4Bku` |

Every id above was read from the connected account's own `/v1/voices` library —
none is invented. No cloning and no imitation of a real person.

Delivery per persona is set with ElevenLabs voice settings (`stability`,
`style`, `similarity_boost`, `speed` clamped to the provider's 0.7–1.2 window).

`voiceProviderStatus` (authenticated) reads the live `/v1/voices` library and
reports, per persona, whether that voice is AVAILABLE on this account. The
library proves availability, not commercial licence terms. The
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

- Adapter, mapping, error translation, availability validation and encoding are
  covered by `src/lib/elevenlabs.test.ts` with a stubbed `fetch` — no credentials
  needed.
- **Live verification: PASSED (2026-09-14).** The ElevenLabs connection is
  linked and `ELEVENLABS_API_KEY` is present server-side only.
  - `GET /v1/voices` returned HTTP 200 with 21 voices; all nine persona voice
    ids (George, Bill, Callum, Daniel, Liam, Sarah, Matilda, Alice, Lily) are
    available on the account.
  - Live speech confirmed with a minimal sample line on `eleven_flash_v2_5`:
    one male (George, HTTP 200, 24,703 bytes) and one female (Sarah, HTTP 200,
    19,688 bytes).
  - Static preview clips in `public/voice-samples/` were re-rendered with the
    same ElevenLabs voices and settings via `bun scripts/build-voice-samples.ts`,
    so the picker previews the real character. `PREVIEW_CLIP_MODEL` now equals
    `ELEVEN_MODEL`.
- `voiceProviderStatus` logs the true state each check
  (`[voice] provider=ElevenLabs connected=… model=… unavailable=… at=…`) and
  returns `checkedAt`; the status card shows the time and a "Check again" button.
- Still not connected elsewhere in the app, and shown as unavailable rather than
  filled in: payments, commercial truck restriction data, engine diagnostics,
  parts suppliers, delivery partners, load boards.

## Adapter corrections (2026-09-14)

- **Cached premium replies are gated.** `speakLine` calls `ai_gate_check` before
  serving a cached clip, so a lapsed subscription or an account paused at its
  daily or weekly cap no longer keeps hearing the paid voice out of the cache.
  The check reserves nothing, spends nothing, and fails closed on a read error.
- **Availability, not licence.** `/v1/voices` proves a voice is available on the
  account; nothing in the app claims it proves commercial licence terms.
- **No raw provider bodies in the log.** Failures log status and the quota
  classification only (`[voice] speech failed status=… quota=…`).
- **Quota wording preserved.** The provider's own explanation (quota exhausted,
  credentials refused, busy, unable to speak the line) is carried through to the
  driver instead of being flattened into one generic message.
- **No unverified refund claims.** When releasing the hold after a provider
  failure itself fails, the reply says the hold is being reconciled rather than
  asserting the credits came back; `runMetered` reports `refunded` truthfully.
- **Preview clips are the real voices.** `public/voice-samples/*.mp3` are
  rendered by `scripts/build-voice-samples.ts` with the same voice ids, model and
  settings used live, verified non-empty and decodable (3.5–6.6 s each). They
  stay static and free to drivers; no earlier-provider clips remain.

Unchanged: 150/600/3000 monthly credits, 10/25/110 daily, 40/150/750 weekly,
America/New_York midnight and Saturday resets, subscriber-only top-ups at
$0.30/credit (10/$3, 50/$15, 100/$30), and the stop/cancel generation-token
fixes in `src/lib/voice.tsx`.
