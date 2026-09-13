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

describe("owner catalogue", () => {
  it("has the exact one-time packs the owner set", async () => {
    const { aiPacks } = await import("@/data/ai-credits");
    expect(aiPacks.map((p) => [p.credits, p.price])).toEqual([
      [300, 10],
      [800, 25],
      [1800, 50],
      [4000, 100],
    ]);
  });

  it("has the exact monthly tiers the owner set", async () => {
    const { aiPlans } = await import("@/data/ai-credits");
    expect(aiPlans.map((p) => [p.credits, p.price])).toEqual([
      [400, 9],
      [1600, 29],
      [4000, 59],
    ]);
  });

  it("never invents an enterprise price or credit allowance", async () => {
    const { aiEnterprise } = await import("@/data/ai-credits");
    expect(aiEnterprise.price).toBeNull();
    expect(aiEnterprise.priceLabel).toBe("Contact for pricing");
    expect("credits" in aiEnterprise).toBe(false);
  });

  it("maps every purchasable item to its own server-side price env var", async () => {
    const { aiPacks, aiPlans } = await import("@/data/ai-credits");
    const envs = [...aiPlans, ...aiPacks].map((i) => i.priceEnv);
    expect(new Set(envs).size).toBe(envs.length);
  });
});
