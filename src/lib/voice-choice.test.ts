import { describe, expect, it } from "vitest";
import {
  femaleVoices,
  maleVoices,
  supportedTtsVoices,
  voiceById,
  voiceOptions,
  TTS_MODEL,
  ELEVEN_MODEL,
} from "@/data/voices";
import { cacheKey } from "@/lib/ai-meter.server";
import { creditCost } from "@/data/ai-credits";

describe("male and female voice choices", () => {
  it("offers real choices in both genders", () => {
    expect(maleVoices.length).toBeGreaterThanOrEqual(3);
    expect(femaleVoices.length).toBeGreaterThanOrEqual(3);
    expect(maleVoices.length + femaleVoices.length).toBe(voiceOptions.length);
  });

  it("previews the same live voice model, and keeps every legacy voice name valid", () => {
    // Preview clips are rendered by the live ElevenLabs model, so the picker
    // previews the real character rather than a different provider.
    expect(TTS_MODEL).toBe(ELEVEN_MODEL);
    for (const v of voiceOptions) {
      expect(supportedTtsVoices).toContain(v.tts);
    }
  });

  it("gives every persona a distinct underlying voice, a sample and a delivery direction", () => {
    const used = new Set(voiceOptions.map((v) => v.tts));
    expect(used.size).toBe(voiceOptions.length);
    for (const v of voiceOptions) {
      expect(v.sample.length).toBeGreaterThan(10);
      expect(v.direction.length).toBeGreaterThan(40);
      expect(v.speed).toBeGreaterThanOrEqual(0.25);
      expect(v.speed).toBeLessThanOrEqual(4);
    }
  });

  it("has exactly one principal voice, defaulted to on an unknown id", () => {
    expect(voiceOptions.filter((v) => v.principal)).toHaveLength(1);
    expect(voiceById("nope" as never).id).toBe("hercules");
  });
});

describe("the chosen voice is carried into every metered request", () => {
  it("keys the cache per voice, so a different voice is a different request", () => {
    const line = "Your clock resets at six.";
    const a = cacheKey("driver-1", [TTS_MODEL, "hercules", line]);
    const b = cacheKey("driver-1", [TTS_MODEL, "athena", line]);
    expect(a).not.toBe(b);
  });

  it("keys the cache per account, so a repeat is only free for the same driver", () => {
    const line = "Your clock resets at six.";
    expect(cacheKey("driver-1", [TTS_MODEL, "hera", line])).not.toBe(
      cacheKey("driver-2", [TTS_MODEL, "hera", line]),
    );
  });

  it("costs the same whichever voice is chosen — no hidden premium per persona", () => {
    const cost = creditCost("speech_premium", 120);
    for (const v of voiceOptions) {
      expect(creditCost("speech_premium", 120)).toBe(cost);
      expect(v.tts).toBeTruthy();
    }
  });
});


describe("audio cache versioning", () => {
  it("never reuses audio rendered with older model/settings", async () => {
    const { ELEVEN_MODEL, VOICE_SETTINGS_VERSION } = await import("@/data/voices");
    const line = "Fuel stop in twenty miles.";
    const now = cacheKey("d1", [ELEVEN_MODEL, VOICE_SETTINGS_VERSION, "hercules", line]);
    expect(now).not.toBe(cacheKey("d1", ["eleven_flash_v2_5", "hercules", line]));
    expect(now).not.toBe(cacheKey("d1", [ELEVEN_MODEL, "older-settings", "hercules", line]));
  });

  it("speech server keys cache and billing identity on the settings version, with gates intact", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/speech.functions.ts", "utf8");
    expect(src).toMatch(/cacheKey\(context\.userId, \[model, VOICE_SETTINGS_VERSION/);
    expect(src).toMatch(/requestIdentity\(context\.userId, \[model, VOICE_SETTINGS_VERSION/);
    // Billing gates still run before any provider call or cache hit.
    const gate = src.indexOf("gateCheck(context.userId");
    expect(src.indexOf('walletQuality(context.userId)) === "eco"')).toBeLessThan(gate);
    expect(gate).toBeLessThan(src.indexOf("cacheGet(ck)"));
    expect(gate).toBeLessThan(src.indexOf("runMetered<string>"));
    expect(src).toContain("middleware([requireSupabaseAuth])");
  });

  it("the app contains no device speech synthesis", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    expect(existsSync("src/lib/device-voice.ts")).toBe(false);
    expect(readFileSync("src/lib/voice.tsx", "utf8")).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
  });
});
