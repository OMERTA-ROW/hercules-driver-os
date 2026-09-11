/**
 * THE HERCULES SERVICE FEE — one configurable place.
 *
 * Every order HERCULES actually places and pays for carries a HERCULES service
 * fee. It scales with the order: a couple of dollars on a shower or a snack run,
 * up to a hundred on a major parts order. It is a line item at confirmation,
 * read aloud before the driver approves, and described for what it is — the
 * money that keeps HERCULES running.
 *
 * TUNING: every rate lives in `feeConfig` below. Each category has its own
 * ladder plus a floor and a ceiling, so a category can be re-priced later by
 * editing one entry — no screen and no voice line has to change.
 *
 * THE ONE EXCEPTION: third-party delivery platforms (DoorDash, Uber Eats,
 * Grubhub, Instacart, GoPuff, Walmart, Walgreens, CVS, Amazon retail) do not
 * allow anyone else to place or process an order for the driver. HERCULES does
 * not process those and takes nothing on them — it hands the cart off pre-filled
 * and the platform charges the driver directly.
 */

export type FeeCategory =
  | "parts"
  | "tires"
  | "roadside"
  | "fuel"
  | "showerParking"
  | "laundry"
  | "securement"
  | "tools"
  | "permits"
  | "delivery";

export type FeeTier = {
  /** Order value ceiling this tier covers. */
  upTo: number;
  fee: number;
  label: string;
};

export type FeeConfigEntry = {
  id: FeeCategory;
  label: string;
  /** Why HERCULES is charging on this one, in the driver's language. */
  note: string;
  /** False = HERCULES never charges here. */
  transacts: boolean;
  /** Ladder used for this category. */
  tiers: FeeTier[];
  minFee: number;
  maxFee: number;
};

/** The default ladder — small transaction, small fee; big parts order, capped. */
export const feeBands: FeeTier[] = [
  { upTo: 50, fee: 2, label: "Under $50" },
  { upTo: 150, fee: 6, label: "$50 – $150" },
  { upTo: 400, fee: 15, label: "$150 – $400" },
  { upTo: 1000, fee: 35, label: "$400 – $1,000" },
  { upTo: 2500, fee: 65, label: "$1,000 – $2,500" },
  { upTo: Infinity, fee: 100, label: "Over $2,500" },
];

/** A flat, tiny ladder for the small stuff a driver buys at a stop. */
const smallBands: FeeTier[] = [
  { upTo: 50, fee: 2, label: "Under $50" },
  { upTo: 150, fee: 4, label: "$50 – $150" },
  { upTo: Infinity, fee: 6, label: "Over $150" },
];

const midBands: FeeTier[] = [
  { upTo: 50, fee: 2, label: "Under $50" },
  { upTo: 150, fee: 6, label: "$50 – $150" },
  { upTo: 400, fee: 12, label: "$150 – $400" },
  { upTo: 1000, fee: 25, label: "$400 – $1,000" },
  { upTo: Infinity, fee: 45, label: "Over $1,000" },
];

/**
 * ALL RATES LIVE HERE. Change a number, change the whole app.
 */
export const feeConfig: Record<FeeCategory, FeeConfigEntry> = {
  parts: {
    id: "parts",
    label: "Truck parts",
    note: "HERCULES sources it, pays the dealer or supplier, gets it to you",
    transacts: true,
    tiers: feeBands,
    minFee: 2,
    maxFee: 100,
  },
  tires: {
    id: "tires",
    label: "Tires & casings",
    note: "Mounted road service or a shop order placed by HERCULES",
    transacts: true,
    tiers: midBands,
    minFee: 2,
    maxFee: 65,
  },
  roadside: {
    id: "roadside",
    label: "Roadside service",
    note: "Mobile mechanic, tow, tire truck — booked and paid through HERCULES",
    transacts: true,
    tiers: midBands,
    minFee: 2,
    maxFee: 65,
  },
  fuel: {
    id: "fuel",
    label: "Fuel & DEF",
    note: "Discounted diesel and DEF authorized through HERCULES",
    transacts: true,
    tiers: smallBands,
    minFee: 2,
    maxFee: 6,
  },
  showerParking: {
    id: "showerParking",
    label: "Showers & parking",
    note: "Reserved at the stop through HERCULES",
    transacts: true,
    tiers: smallBands,
    minFee: 2,
    maxFee: 4,
  },
  laundry: {
    id: "laundry",
    label: "Laundry",
    note: "Machine time held for you at the stop",
    transacts: true,
    tiers: smallBands,
    minFee: 2,
    maxFee: 4,
  },
  securement: {
    id: "securement",
    label: "Load securement",
    note: "Straps, chains, tarps, binders, load bars",
    transacts: true,
    tiers: midBands,
    minFee: 2,
    maxFee: 25,
  },
  tools: {
    id: "tools",
    label: "Tools & PPE",
    note: "Hand tools, gloves, boots, vests, lights",
    transacts: true,
    tiers: smallBands,
    minFee: 2,
    maxFee: 6,
  },
  permits: {
    id: "permits",
    label: "Permits, scales & tolling",
    note: "Trip and oversize permits, scale bypass and toll accounts HERCULES files for you",
    transacts: true,
    tiers: midBands,
    minFee: 2,
    maxFee: 45,
  },
  delivery: {
    id: "delivery",
    label: "Food, grocery & retail delivery",
    note: "The platform takes the payment, not HERCULES — no fee here, ever",
    transacts: false,
    tiers: [{ upTo: Infinity, fee: 0, label: "Any order" }],
    minFee: 0,
    maxFee: 0,
  },
};

/** Category list for the screens that explain the fee. */
export const feeCategories: { id: FeeCategory; label: string; note: string }[] = Object.values(
  feeConfig,
)
  .filter((c) => c.transacts)
  .map((c) => ({ id: c.id, label: c.label, note: c.note }));

/** The scaled HERCULES service fee for an order HERCULES actually transacts. */
export function serviceFeeFor(amount: number, category: FeeCategory = "parts"): number {
  const cfg = feeConfig[category];
  if (!cfg.transacts) return 0;
  const tier = cfg.tiers.find((t) => amount <= t.upTo)?.fee ?? cfg.maxFee;
  return Math.min(cfg.maxFee, Math.max(cfg.minFee, tier));
}

/** Fee plus order value — what the driver's card actually sees. */
export function totalWithFee(amount: number, category: FeeCategory = "parts") {
  const fee = serviceFeeFor(amount, category);
  return { subtotal: amount, fee, total: amount + fee };
}

/** Plain-English line HERCULES shows and reads out before approval. */
export function feeLine(amount: number, category: FeeCategory = "parts"): string {
  const cfg = feeConfig[category];
  if (!cfg.transacts) return NO_FEE_HANDOFF;
  const fee = serviceFeeFor(amount, category);
  return `$${fee.toFixed(2)} HERCULES service fee — this is what keeps HERCULES running and the platform operating. It is on this order because HERCULES places and pays it for you.`;
}

/** Spoken form, for the read-back before the driver says yes. */
export function spokenFee(amount: number, category: FeeCategory = "parts"): string {
  const cfg = feeConfig[category];
  if (!cfg.transacts) return "There's no HERCULES fee on this one — the app charges you directly.";
  const { fee, total } = totalWithFee(amount, category);
  return `${amount.toFixed(2)} dollars for the order, plus a ${fee.toFixed(
    2,
  )} dollar HERCULES service fee — ${total.toFixed(
    2,
  )} dollars all in. The fee is what keeps HERCULES running. Nothing is charged until you say yes.`;
}

/** Delivery hand-offs carry no HERCULES fee. Said plainly, every time. */
export const NO_FEE_HANDOFF =
  "No HERCULES fee on this one. The delivery app charges you directly — HERCULES only fills the order in for you.";
