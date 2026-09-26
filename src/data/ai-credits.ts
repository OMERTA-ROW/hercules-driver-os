/**
 * AI ASSISTANCE CREDITS — one editable catalogue.
 *
 * Everything money- or cost-related about AI assistance lives here: the
 * monthly subscriptions, the buy-once packs, what each AI action costs the
 * driver in credits, and our own cost assumptions per provider call. Change a
 * number here and the whole app (pricing, settings, voice read-backs, server
 * metering, margin reporting) follows.
 *
 * This is SEPARATE from the platform plans in `src/data/plans.ts`. A driver's
 * app subscription is not affected by AI credits and vice versa.
 *
 * PROVENANCE (owner direction, 2026-09-13): the repository, its history and
 * every data file were searched for a pre-existing numeric AI credit
 * allowance and none exists — the only earlier "credits" in this project are
 * truck-stop shower credits and supplier loyalty credits, which are
 * unrelated. The owner set the FINAL amounts directly ("lower thw credits"):
 * monthly Assist 300/$9, Pro 1000/$29, Max 3500/$100; buy-once Small
 * 200/$10, Medium 550/$25, Large 1200/$50; Enterprise is contact-for-pricing.
 * There is no $100 buy-once pack and no $59 monthly plan. These amounts are
 * now the owner's final guideline; change them here only. Nothing else
 * hardcodes an amount.
 *
 * Core app prices are authoritative and are NOT defined here:
 *   - platform plans .......... src/data/plans.ts  ($5 / $29 / $19 per truck)
 *   - Voice Hand-Off add-on ... src/data/addons.ts ($5.00 / month)
 *   - Document Upload ......... src/data/addons.ts ($5.00 one time)
 */

export type AiPlanId = "assist" | "pro" | "max";
export type AiPackId = "topup10" | "topup50" | "topup100";

/**
 * SUBSCRIBER-ONLY TOP-UPS — owner-set price, USD $0.30 per credit.
 * An account with no active monthly AI plan cannot buy a top-up and cannot
 * spend credits on paid voice at all. Enforced on the server, not here.
 */
export const TOPUP_USD_PER_CREDIT = 0.3;
export const TOPUPS_SUBSCRIBERS_ONLY = true;

export type AiPlan = {
  id: AiPlanId;
  name: string;
  credits: number;
  price: number;
  blurb: string;
  /**
   * Owner-approved daily and weekly caps, in credits (see `planCaps`). Caps are
   * limits only — going over never causes a charge, and a reset never adds a
   * credit. The live values the server enforces are rows in
   * `ai_plan_allowances`; `allowanceRows()` is what both sides are synced from.
   */
  dailyCredits: number;
  weeklyCredits: number;
  /** True only while a monthly total is awaiting the owner's figure. */
  monthlyPendingApproval: boolean;
  /** Server-side env var holding the payment provider's price id. */
  priceEnv: string;
};

/* ------------------------------------------------------------------------ *
 * MONTHLY TOTALS AND CAPS — owner approved 2026-09-13
 *
 * Shaped after a public consumer voice plan ladder (ElevenLabs' published
 * Starter / Creator / Pro tiers) purely as a PROPORTION guide. Their allowances
 * are provider characters, not HERCULES credits, so nothing here claims parity,
 * equivalence or a proven cost basis — the proportions were adapted and the
 * amounts set by the owner.
 *
 * Change a number here, then sync `ai_plan_allowances` with the statement in
 * docs/ai-credits.md so the server enforces the same caps.
 * ------------------------------------------------------------------------ */

export const MONTHLY_CREDITS_PENDING = false;

/** Owner-approved monthly included amounts. */
export const monthlyCreditAmounts: Record<AiPlanId, number> = {
  assist: 150,
  pro: 600,
  max: 3000,
};

/**
 * Owner-approved caps. These reset USAGE COUNTERS only — a reset never adds a
 * credit to the wallet. Days end at midnight America/New_York, weeks at
 * Saturday 00:00 America/New_York (daylight saving handled server-side).
 */
export const planCaps: Record<AiPlanId, { daily: number; weekly: number }> = {
  assist: { daily: 10, weekly: 40 },
  pro: { daily: 25, weekly: 150 },
  max: { daily: 110, weekly: 750 },
};

export const ALLOWANCE_TIMEZONE = "America/New_York";

export type AiPack = {
  id: AiPackId;
  name: string;
  credits: number;
  price: number;
  blurb: string;
  priceEnv: string;
};

/** Monthly subscriptions. Credits expire at the end of each paid period. */
const planBase: { id: AiPlanId; name: string; price: number; blurb: string; priceEnv: string }[] = [
  {
    id: "assist",
    name: "Assist",
    price: 9,
    blurb: "Everyday spoken answers and read-backs.",
    priceEnv: "STRIPE_PRICE_AI_ASSIST",
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    blurb: "Heavy all-day use, long spoken read-backs, premium personas.",
    priceEnv: "STRIPE_PRICE_AI_PRO",
  },
  {
    id: "max",
    name: "Max",
    price: 100,
    blurb: "The largest monthly allowance, for drivers using spoken commands all day.",
    priceEnv: "STRIPE_PRICE_AI_MAX",
  },
];

export const aiPlans: AiPlan[] = planBase.map((p) => ({
  ...p,
  credits: monthlyCreditAmounts[p.id],
  dailyCredits: planCaps[p.id].daily,
  weeklyCredits: planCaps[p.id].weekly,
  monthlyPendingApproval: MONTHLY_CREDITS_PENDING,
}));

/** The rows the database's `ai_plan_allowances` table must hold. */
export function allowanceRows() {
  return aiPlans.map((p) => ({
    planId: p.id,
    dailyCredits: p.dailyCredits,
    weeklyCredits: p.weeklyCredits,
  }));
}

/**
 * SUBSCRIBER TOP-UPS — buy once, carried over, never expire.
 * Every amount below is exactly $0.30 per credit, the owner's set rate.
 * Only an account with an active monthly plan may buy or spend these.
 */
export const aiPacks: AiPack[] = [10, 50, 100].map((credits) => ({
  id: `topup${credits}` as AiPackId,
  name: `${credits.toLocaleString()} credits`,
  credits,
  price: Number((credits * TOPUP_USD_PER_CREDIT).toFixed(2)),
  blurb: `$${TOPUP_USD_PER_CREDIT.toFixed(2)} per credit · subscribers only`,
  priceEnv: `STRIPE_PRICE_AI_TOPUP_${credits}`,
}));

/**
 * Enterprise / fleet AI assistance is quoted, never priced here. No credit
 * allowance is invented for it: the owner sets both after talking to the
 * customer. Requests arrive through the in-app form on /credits.
 */
export const aiEnterprise = {
  name: "Enterprise",
  price: null as null,
  priceLabel: "Contact for pricing",
  blurb:
    "Large fleets, many trucks, custom credit allowance and invoicing. We quote it with you — no set price or credit amount.",
  fleetSizeMin: 1,
  fleetSizeMax: 100000,
};

export function aiPlanById(id: string): AiPlan | undefined {
  return aiPlans.find((p) => p.id === id);
}
export function aiPackById(id: string): AiPack | undefined {
  return aiPacks.find((p) => p.id === id);
}

/* ------------------------------------------------------------------------ */
/* What things cost the driver                                              */
/* ------------------------------------------------------------------------ */

/** Only actions that actually exist in the app are listed here. */
export type AiAction = "speech" | "speech_premium";

/**
 * Server-owned credit costs. `perUnit` is charged per `unit` characters of
 * input, on top of `base`, and the total is clamped to `max` so a single
 * action can never run away.
 */
export const aiActionCosts: Record<
  AiAction,
  { label: string; base: number; perUnit: number; unit: number; max: number }
> = {
  speech: {
    label: "Spoken line (standard voice)",
    base: 1,
    perUnit: 1,
    unit: 240,
    max: 6,
  },
  speech_premium: {
    label: "Spoken line (premium persona)",
    base: 2,
    perUnit: 1,
    unit: 200,
    max: 10,
  },
};

/** Hard input caps — refuse before spending anything at the provider. */
export const aiLimits = {
  /** Longest line we will ever send to speech. */
  maxSpeechChars: 900,
  /** Longest prompt we will ever send to a text model. */
  maxPromptChars: 4000,
  /** Paid calls allowed per account per minute. */
  perMinute: 20,
  /** Paid calls allowed per account per hour. */
  perHour: 240,
  /** How long an identical request may be served from cache (seconds). */
  cacheTtlSeconds: 900,
  /** Balance at or below this shows the low-credit state. */
  lowBalance: 25,
};

/**
 * OUR estimated cost per provider call, in USD. These are assumptions for
 * margin reporting, not measured invoices — anything derived from them is
 * labelled "estimated" in the app.
 */
export const providerCostAssumptions = {
  /** USD per 1,000 characters of text-to-speech. */
  ttsPerKChar: 0.015,
  /** What one credit is sold for, averaged across the catalogue. */
  creditPriceUsd: 0.019,
  updated: "2026-09-13",
};

/** Cost in credits for an action of a given input size. Server is the truth. */
export function creditCost(action: AiAction, chars: number): number {
  const c = aiActionCosts[action];
  const units = Math.ceil(Math.max(0, chars) / c.unit);
  return Math.max(1, Math.min(c.max, c.base + units * c.perUnit));
}

/** Estimated provider cost in USD for a speech call of this length. */
export function estimatedTtsCostUsd(chars: number): number {
  return Number(((chars / 1000) * providerCostAssumptions.ttsPerKChar).toFixed(5));
}

/** Plain-English cost preview shown BEFORE the driver uses anything. */
export function costPreview(action: AiAction, chars: number): string {
  const n = creditCost(action, chars);
  return `${n} credit${n === 1 ? "" : "s"}`;
}

/** Things that never cost a credit, stated plainly to the driver. */
export const freeForever = [
  "Navigation, the map and hazard warnings",
  "Clock, loads, money and health screens",
  "Every safety and breakdown action, including calling for help",
  'Fixed commands the app answers itself ("where am I", "how many hours")',
  "On-screen replies, when premium speech is off or unavailable",
];

/* ------------------------------------------------------------------------ */
/* Daily and weekly allowance (monthly plans only)                          */
/* ------------------------------------------------------------------------ */

/**
 * Weeks run Saturday to Saturday: an allowance week resets at 00:00 UTC on
 * Saturday, days reset at 00:00 UTC. Both are enforced in the database.
 */
export const ALLOWANCE_WEEK_RESET_DAY = "Saturday";

export function allowanceFor(planId: string | null | undefined) {
  const plan = planId ? aiPlanById(planId) : undefined;
  if (!plan) return null;
  return { daily: plan.dailyCredits, weekly: plan.weeklyCredits, plan };
}

/** Plain-language line shown when paid speech is paused at a cap. */
export function allowancePausedLine(scope: "daily" | "weekly", resetsAt: string | null): string {
  const when = resetsAt
    ? new Date(resetsAt).toLocaleString("en-US", {
        timeZone: ALLOWANCE_TIMEZONE,
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }) + " ET"
    : "the next reset";
  return scope === "daily"
    ? `That is today's spoken-line allowance used. The real voice comes back ${when} — until then replies are shown on screen, free. Nothing extra was charged, and a top-up will not lift today's cap.`
    : `That is this week's spoken-line allowance used. The real voice comes back ${ALLOWANCE_WEEK_RESET_DAY}, ${when} — until then replies are shown on screen, free. Nothing extra was charged, and a top-up will not lift the weekly cap.`;
}
