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
 * unrelated. The owner then set the current amounts directly: "lower the
 * credits a lil so we can keep users spending and making money" — the
 * original provisional allowances reduced by 20%, prices unchanged. These
 * amounts are now the owner's guideline; change them here only. Nothing else
 * hardcodes an amount.
 *
 * Core app prices are authoritative and are NOT defined here:
 *   - platform plans .......... src/data/plans.ts  ($5 / $29 / $19 per truck)
 *   - Voice Hand-Off add-on ... src/data/addons.ts ($5.00 / month)
 *   - Document Upload ......... src/data/addons.ts ($5.00 one time)
 */


export type AiPlanId = "assist" | "pro" | "max";
export type AiPackId = "pack200" | "pack800" | "pack2400";

export type AiPlan = {
  id: AiPlanId;
  name: string;
  credits: number;
  price: number;
  blurb: string;
  /** Server-side env var holding the payment provider's price id. */
  priceEnv: string;
};

export type AiPack = {
  id: AiPackId;
  name: string;
  credits: number;
  price: number;
  blurb: string;
  priceEnv: string;
};

/** Monthly subscriptions. Credits expire at the end of each paid period. */
export const aiPlans: AiPlan[] = [
  {
    id: "assist",
    name: "Assist",
    credits: 500,
    price: 9,
    blurb: "Everyday spoken answers and read-backs.",
    priceEnv: "STRIPE_PRICE_AI_ASSIST",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 2000,
    price: 29,
    blurb: "Heavy all-day use, long conversations, premium voices.",
    priceEnv: "STRIPE_PRICE_AI_PRO",
  },
  {
    id: "max",
    name: "Max",
    credits: 5000,
    price: 59,
    blurb: "Team seats and constant assistance on long hauls.",
    priceEnv: "STRIPE_PRICE_AI_MAX",
  },
];

/** Buy-once packs. These credits carry over and never expire. */
export const aiPacks: AiPack[] = [
  {
    id: "pack250",
    name: "250 credits",
    credits: 250,
    price: 6,
    blurb: "Top up for a busy week.",
    priceEnv: "STRIPE_PRICE_AI_PACK_250",
  },
  {
    id: "pack1000",
    name: "1,000 credits",
    credits: 1000,
    price: 20,
    blurb: "Best value top-up.",
    priceEnv: "STRIPE_PRICE_AI_PACK_1000",
  },
  {
    id: "pack3000",
    name: "3,000 credits",
    credits: 3000,
    price: 49,
    blurb: "Stock up once, use it all year.",
    priceEnv: "STRIPE_PRICE_AI_PACK_3000",
  },
];

export function aiPlanById(id: string): AiPlan | undefined {
  return aiPlans.find((p) => p.id === id);
}
export function aiPackById(id: string): AiPack | undefined {
  return aiPacks.find((p) => p.id === id);
}

/* ------------------------------------------------------------------------ */
/* What things cost the driver                                              */
/* ------------------------------------------------------------------------ */

export type AiAction = "speech" | "speech_premium" | "assistant";

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
  assistant: {
    label: "AI assistant answer",
    base: 2,
    perUnit: 1,
    unit: 400,
    max: 15,
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
  /** USD per 1,000 input tokens for the assistant model. */
  assistantPerKInputTokens: 0.0006,
  /** USD per 1,000 output tokens for the assistant model. */
  assistantPerKOutputTokens: 0.0024,
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
  "Navigation, the map, hazards and truck-legal routing",
  "Clock, loads, money and health screens",
  "Every safety and breakdown action, including calling for help",
  "Fixed commands the app answers itself (\"where am I\", \"how many hours\")",
  "Your device's own built-in voice, when premium speech is off or unavailable",
];
