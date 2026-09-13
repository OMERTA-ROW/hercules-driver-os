import { describe, expect, it, vi, beforeEach } from "vitest";
import { aiActionCosts, aiLimits, creditCost, estimatedTtsCostUsd } from "@/data/ai-credits";
import { cacheGet, cacheKey, cacheSet, dedupe, rateLimit } from "@/lib/ai-meter.server";

describe("credit costs are server-owned and bounded", () => {
  it("charges at least the base cost", () => {
    expect(creditCost("speech", 1)).toBeGreaterThanOrEqual(aiActionCosts.speech.base);
  });

  it("never exceeds the per-action ceiling, however long the input", () => {
    for (const action of ["speech", "speech_premium", "assistant"] as const) {
      expect(creditCost(action, 500_000)).toBe(aiActionCosts[action].max);
    }
  });

  it("grows with input length", () => {
    expect(creditCost("speech", 1000)).toBeGreaterThan(creditCost("speech", 100));
  });

  it("labels provider cost as an estimate derived from the published assumption", () => {
    expect(estimatedTtsCostUsd(1000)).toBeGreaterThan(0);
    expect(estimatedTtsCostUsd(0)).toBe(0);
  });
});

describe("private per-account cache", () => {
  it("never serves one account's audio to another", () => {
    const a = cacheKey("user-a", ["tts", "zeus", "roll out"]);
    const b = cacheKey("user-b", ["tts", "zeus", "roll out"]);
    cacheSet(a, "audio-a");
    expect(cacheGet(a)).toBe("audio-a");
    expect(cacheGet(b)).toBeNull();
  });
});

describe("in-flight de-duplication", () => {
  it("collapses identical concurrent requests into one provider call", async () => {
    const call = vi.fn(async () => "one");
    const key = `dedupe-${Math.random()}`;
    const [x, y] = await Promise.all([dedupe(key, call), dedupe(key, call)]);
    expect(call).toHaveBeenCalledTimes(1);
    expect(x).toBe("one");
    expect(y).toBe("one");
  });
});

describe("rate limiting", () => {
  beforeEach(() => vi.useRealTimers());

  it("blocks an account that loops on paid calls", () => {
    const user = `user-${Math.random()}`;
    for (let i = 0; i < aiLimits.perMinute; i++) {
      expect(rateLimit(user).ok).toBe(true);
    }
    const blocked = rateLimit(user);
    expect(blocked.ok).toBe(false);
  });

  it("keeps accounts independent", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < aiLimits.perMinute; i++) rateLimit(a);
    expect(rateLimit(a).ok).toBe(false);
    expect(rateLimit(b).ok).toBe(true);
  });
});
