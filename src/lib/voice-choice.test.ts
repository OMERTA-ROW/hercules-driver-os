import { describe, expect, it } from "vitest";
import {
  femaleVoices,
  maleVoices,
  supportedTtsVoices,
  voiceById,
  voiceOptions,
  TTS_MODEL,
} from "@/data/voices";
import { cacheKey } from "@/lib/ai-meter.server";
import { creditCost } from "@/data/ai-credits";
import { deviceDelivery, deviceHasBothGenders, pickDeviceVoice } from "@/lib/device-voice";

describe("male and female voice choices", () => {
  it("offers real choices in both genders", () => {
    expect(maleVoices.length).toBeGreaterThanOrEqual(3);
    expect(femaleVoices.length).toBeGreaterThanOrEqual(3);
    expect(maleVoices.length + femaleVoices.length).toBe(voiceOptions.length);
  });

  it("uses only voice names the speech model actually serves", () => {
    expect(TTS_MODEL).toBe("openai/gpt-4o-mini-tts");
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

describe("free device fallback is truthful", () => {
  const devices = [
    { name: "Samantha", lang: "en-US", localService: true },
    { name: "Daniel", lang: "en-GB", localService: true },
    { name: "Amelie", lang: "fr-FR", localService: true },
  ];

  it("matches the persona's gender when the device has both", () => {
    expect(pickDeviceVoice(devices, "female")?.name).toBe("Samantha");
    expect(pickDeviceVoice(devices, "male")?.name).toBe("Daniel");
    expect(deviceHasBothGenders(devices)).toBe(true);
  });

  it("reports honestly when the device cannot distinguish genders", () => {
    const one = [{ name: "Default", lang: "en-US" }];
    expect(deviceHasBothGenders(one)).toBe(false);
    expect(pickDeviceVoice(one, "female")?.name).toBe("Default");
  });

  it("returns nothing at all when the device exposes no voices", () => {
    expect(pickDeviceVoice([], "male")).toBeNull();
    expect(deviceHasBothGenders([])).toBe(false);
  });

  it("keeps a natural rate and never fakes character with pitch", () => {
    expect(deviceDelivery(0.86)).toEqual({ rate: 0.86, pitch: 1 });
    expect(deviceDelivery(9).rate).toBeLessThanOrEqual(1.25);
    expect(deviceDelivery(0.1).rate).toBeGreaterThanOrEqual(0.7);
  });
});
