/**
 * ELEVENLABS SPEECH ADAPTER — server only.
 *
 * The API key arrives as `ELEVENLABS_API_KEY` from the native ElevenLabs
 * connector and is read inside handlers only. It is never exposed to the
 * browser and never mirrored into a VITE_ variable.
 *
 * Everything here is a pure-ish function over `fetch`, so the mapping, the
 * error translation and the licence validation can be regression-tested with a
 * stubbed fetch and no credentials.
 */
import { ELEVEN_MODEL, type VoiceOption } from "@/data/voices";

export const ELEVEN_API = "https://api.elevenlabs.io";

export function elevenLabsKey(): string | null {
  const key = process.env["ELEVENLABS_API_KEY"];
  return key && key.trim() ? key.trim() : null;
}

export function elevenLabsConfigured(): boolean {
  return elevenLabsKey() !== null;
}

export type ProviderFailure = {
  /** HTTP status from ElevenLabs, 0 when the call never completed. */
  status: number;
  /** Plain-language line for the driver. Never leaks the key or raw body. */
  message: string;
  /** True when the account has no quota left rather than a transient fault. */
  quota: boolean;
};

/** Turns an ElevenLabs failure into an honest driver-facing line. */
export function describeElevenFailure(status: number, body: string): ProviderFailure {
  const quota = status === 401 && /quota/i.test(body);
  if (status === 401 || status === 403) {
    return {
      status,
      quota,
      message: quota
        ? "The voice service has no character quota left on this account, so your device spoke the line free. You weren't charged."
        : "The voice service refused this app's credentials, so your device spoke the line free. You weren't charged.",
    };
  }
  if (status === 429) {
    return {
      status,
      quota: false,
      message: "The voice service is busy — try that again in a moment. You weren't charged.",
    };
  }
  if (status === 422 || status === 400) {
    return {
      status,
      quota: false,
      message: "The voice service could not speak that line, so your device spoke it free.",
    };
  }
  return {
    status,
    quota: false,
    message: "The voice service didn't answer, so your device spoke the line free. You weren't charged.",
  };
}

export class ElevenLabsError extends Error {
  constructor(readonly failure: ProviderFailure) {
    super(`elevenlabs_${failure.status}`);
  }
  /** `runMetered` reads this to refund the hold and report the status. */
  get status() {
    return this.failure.status;
  }
}

/** Base64-encodes audio bytes without blowing the stack on long clips. */
export function audioDataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}

/** Persona delivery → ElevenLabs voice settings. */
export function elevenSettings(persona: VoiceOption) {
  return {
    stability: persona.stability,
    similarity_boost: 0.75,
    style: persona.style,
    use_speaker_boost: true,
    // ElevenLabs accepts 0.7–1.2; the persona speeds sit inside that window.
    speed: Math.min(1.2, Math.max(0.7, persona.speed)),
  };
}

export type SpeakDeps = { fetch: typeof fetch; key: string };

/**
 * Speaks one line in a persona's licensed stock voice and returns a playable
 * data URL. Throws `ElevenLabsError` on any provider failure so the caller's
 * credit hold is refunded in full.
 */
export async function elevenSpeak(
  persona: VoiceOption,
  text: string,
  opts: { signal?: AbortSignal; deps?: SpeakDeps } = {},
): Promise<string> {
  const key = opts.deps?.key ?? elevenLabsKey();
  if (!key) throw new ElevenLabsError({ status: 0, quota: false, message: "not_configured" });
  const doFetch = opts.deps?.fetch ?? fetch;

  const res = await doFetch(
    `${ELEVEN_API}/v1/text-to-speech/${persona.eleven}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: elevenSettings(persona),
      }),
      ...(opts.signal ? { signal: opts.signal } : {}),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const failure = describeElevenFailure(res.status, body);
    // Status and classification only — the provider's raw body can echo request
    // content and account detail, so it is never written to the log.
    console.error(`[voice] speech failed status=${res.status} quota=${failure.quota}`);
    throw new ElevenLabsError(failure);
  }

  return audioDataUrl(new Uint8Array(await res.arrayBuffer()));
}

export type VoiceCheck = {
  id: string;
  name: string;
  /** The persona this voice backs. */
  persona: string;
  available: boolean;
};

/**
 * Reads the live voice library and confirms every persona is mapped to a voice
 * this account can actually USE. Availability in the library is what this
 * proves — it is not a statement about commercial licensing terms, which live
 * in the account's own agreement with the provider. Nothing is cloned or
 * created here; only the provider's own stock voices are used.
 */
export async function verifyElevenVoices(
  personas: VoiceOption[],
  deps?: SpeakDeps,
): Promise<
  | { ok: true; model: string; voices: VoiceCheck[] }
  | { ok: false; status: number; message: string }
> {
  const key = deps?.key ?? elevenLabsKey();
  if (!key) return { ok: false, status: 0, message: "ElevenLabs is not connected to this app." };
  const doFetch = deps?.fetch ?? fetch;

  const res = await doFetch(`${ELEVEN_API}/v1/voices`, { headers: { "xi-api-key": key } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const failure = describeElevenFailure(res.status, body);
    console.error(`[voice] voice list failed status=${res.status} quota=${failure.quota}`);
    return { ok: false, status: res.status, message: failure.message };
  }
  const data = (await res.json()) as { voices?: { voice_id?: string; name?: string }[] };
  const live = new Map((data.voices ?? []).map((v) => [v.voice_id ?? "", v.name ?? ""]));

  return {
    ok: true,
    model: ELEVEN_MODEL,
    voices: personas.map((p) => ({
      id: p.eleven,
      name: live.get(p.eleven) ?? p.elevenName,
      persona: p.name,
      available: live.has(p.eleven),
    })),
  };
}
