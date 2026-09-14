import { describe, expect, it } from "vitest";
import { femaleVoices, maleVoices, voiceOptions, ELEVEN_MODEL } from "@/data/voices";
import {
  ElevenLabsError,
  audioDataUrl,
  describeElevenFailure,
  elevenSettings,
  elevenSpeak,
  verifyElevenVoices,
} from "@/lib/elevenlabs.server";

const deps = (impl: (url: string, init?: RequestInit) => Response) => ({
  key: "test-key",
  fetch: (async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(String(input), init)) as unknown as typeof fetch,
});

describe("persona → licensed ElevenLabs voice mapping", () => {
  it("maps five male and four female personas to distinct stock voice ids", () => {
    expect(maleVoices).toHaveLength(5);
    expect(femaleVoices).toHaveLength(4);
    const ids = voiceOptions.map((v) => v.eleven);
    expect(new Set(ids).size).toBe(voiceOptions.length);
    for (const v of voiceOptions) {
      expect(v.eleven).toMatch(/^[A-Za-z0-9]{20}$/);
      expect(v.elevenName.length).toBeGreaterThan(2);
    }
  });

  it("uses the low-latency model and provider-legal voice settings", () => {
    expect(ELEVEN_MODEL).toBe("eleven_flash_v2_5");
    for (const v of voiceOptions) {
      const s = elevenSettings(v);
      expect(s.speed).toBeGreaterThanOrEqual(0.7);
      expect(s.speed).toBeLessThanOrEqual(1.2);
      expect(s.stability).toBeGreaterThanOrEqual(0);
      expect(s.stability).toBeLessThanOrEqual(1);
      expect(s.style).toBeGreaterThanOrEqual(0);
      expect(s.style).toBeLessThanOrEqual(1);
    }
  });
});

describe("speaking a line", () => {
  it("calls the persona's voice with the flash model and returns playable audio", async () => {
    let seen = { url: "", body: "" };
    const audio = await elevenSpeak(voiceOptions[0]!, "Test line", {
      deps: deps((url, init) => {
        seen = { url, body: String(init?.body ?? "") };
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }),
    });
    expect(seen.url).toContain(`/v1/text-to-speech/${voiceOptions[0]!.eleven}`);
    expect(seen.url).toContain("output_format=mp3_44100_128");
    expect(JSON.parse(seen.body).model_id).toBe("eleven_flash_v2_5");
    expect(audio.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });

  it("never sends the key in the URL", async () => {
    let url = "";
    await elevenSpeak(voiceOptions[1]!, "Hi", {
      deps: deps((u) => {
        url = u;
        return new Response(new Uint8Array([9]), { status: 200 });
      }),
    });
    expect(url).not.toContain("test-key");
  });

  it("throws a refundable provider error on quota, auth, rate limit and outage", async () => {
    for (const [status, body] of [
      [401, "quota_exceeded"],
      [401, "invalid api key"],
      [429, ""],
      [500, ""],
    ] as [number, string][]) {
      await expect(
        elevenSpeak(voiceOptions[0]!, "Hi", {
          deps: deps(() => new Response(body, { status })),
        }),
      ).rejects.toBeInstanceOf(ElevenLabsError);
    }
  });

  it("tells the driver they were not charged and their device spoke instead", () => {
    expect(describeElevenFailure(401, "quota_exceeded").quota).toBe(true);
    for (const status of [401, 403, 429, 500, 0]) {
      const f = describeElevenFailure(status, "");
      expect(f.message).toMatch(/device|moment/i);
    }
    expect(describeElevenFailure(429, "").message).toMatch(/moment/i);
  });

  it("refuses to call anything when no key is configured", async () => {
    await expect(
      elevenSpeak(voiceOptions[0]!, "Hi", {
        deps: {
          key: "",
          fetch: (() => {
            throw new Error("must not call the provider");
          }) as unknown as typeof fetch,
        },
      }),
    ).rejects.toBeInstanceOf(ElevenLabsError);
  });
});

describe("licence verification against the live voice library", () => {
  it("flags a persona whose voice this account cannot use", async () => {
    const res = await verifyElevenVoices(
      voiceOptions,
      deps(
        () =>
          new Response(
            JSON.stringify({
              voices: voiceOptions
                .slice(1)
                .map((v) => ({ voice_id: v.eleven, name: v.elevenName })),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.voices.filter((v) => !v.available)).toHaveLength(1);
    expect(res.voices.find((v) => !v.available)?.persona).toBe(voiceOptions[0]!.name);
  });

  it("reports an honest failure instead of claiming voices", async () => {
    const res = await verifyElevenVoices(voiceOptions, deps(() => new Response("", { status: 401 })));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toMatch(/credentials|quota/i);
  });
});

describe("audio encoding", () => {
  it("encodes long clips without blowing the stack", () => {
    const url = audioDataUrl(new Uint8Array(300_000).fill(7));
    expect(url.startsWith("data:audio/mpeg;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(100_000);
  });
});
