import { describe, expect, it } from "vitest";
import {
  ALLOWANCE_WEEK_RESET_DAY,
  TOPUP_USD_PER_CREDIT,
  aiPacks,
  MONTHLY_CREDITS_PENDING,
  aiPlans,
  allowanceFor,
  allowanceRows,
  planCaps,
  allowancePausedLine,
} from "@/data/ai-credits";

/**
 * The catalogue is the owner's price list. These tests keep it honest: top-ups
 * are exactly $0.30 a credit, every monthly plan states a daily and weekly
 * allowance, and no allowance can exceed the amount the plan includes.
 */
describe("credit catalogue", () => {
  it("prices every top-up at exactly $0.30 per credit", () => {
    expect(TOPUP_USD_PER_CREDIT).toBe(0.3);
    expect(aiPacks.length).toBeGreaterThan(0);
    for (const p of aiPacks) {
      expect(p.price).toBeCloseTo(p.credits * 0.3, 2);
      expect(p.priceEnv).toBe(`STRIPE_PRICE_AI_TOPUP_${p.credits}`);
    }
  });

  it("carries the owner-approved monthly amounts and prices", () => {
    expect(MONTHLY_CREDITS_PENDING).toBe(false);
    for (const p of aiPlans) expect(p.monthlyPendingApproval).toBe(false);
    expect(aiPlans.map((p) => [p.id, p.credits, p.price])).toEqual([
      ["assist", 150, 9],
      ["pro", 600, 29],
      ["max", 3000, 100],
    ]);
  });

  it("carries the owner-approved caps for every plan", () => {
    expect(aiPlans.map((p) => [p.id, p.dailyCredits, p.weeklyCredits])).toEqual([
      ["assist", 10, 40],
      ["pro", 25, 150],
      ["max", 110, 750],
    ]);
    for (const p of aiPlans) {
      expect({ daily: p.dailyCredits, weekly: p.weeklyCredits }).toEqual(planCaps[p.id]);
      // A cap can never let a month be spent in a day or a week.
      expect(p.weeklyCredits).toBeLessThan(p.credits);
      expect(p.dailyCredits).toBeLessThan(p.weeklyCredits);
    }
  });

  it("states a daily and weekly allowance that fits inside the monthly amount", () => {
    for (const p of aiPlans) {
      expect(p.dailyCredits).toBeGreaterThan(0);
      expect(p.weeklyCredits).toBeGreaterThan(p.dailyCredits);
      expect(p.weeklyCredits).toBeLessThanOrEqual(p.credits);
      expect(allowanceFor(p.id)).toEqual({
        daily: p.dailyCredits,
        weekly: p.weeklyCredits,
        plan: p,
      });
    }
    expect(allowanceFor(null)).toBeNull();
    expect(allowanceFor("nope")).toBeNull();
  });

  it("keeps the database allowance rows in step with the catalogue", () => {
    expect(allowanceRows()).toEqual(
      aiPlans.map((p) => ({
        planId: p.id,
        dailyCredits: p.dailyCredits,
        weeklyCredits: p.weeklyCredits,
      })),
    );
  });

  it("gives larger tiers more credits per dollar within each purchase type", () => {
    const perDollar = (c: number, p: number) => c / p;
    for (let i = 1; i < aiPlans.length; i++) {
      expect(perDollar(aiPlans[i]!.credits, aiPlans[i]!.price)).toBeGreaterThanOrEqual(
        perDollar(aiPlans[i - 1]!.credits, aiPlans[i - 1]!.price),
      );
    }
  });

  it("names the reset when paid conversation pauses", () => {
    expect(ALLOWANCE_WEEK_RESET_DAY).toBe("Saturday");
    const daily = allowancePausedLine("daily", "2026-09-14T00:00:00Z");
    expect(daily).toMatch(/today/i);
    expect(daily).toMatch(/resets/i);
    const weekly = allowancePausedLine("weekly", null);
    expect(weekly).toMatch(/Saturday/);
    expect(weekly).toMatch(/free/i);
  });
});
