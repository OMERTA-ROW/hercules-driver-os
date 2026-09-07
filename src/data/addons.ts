/**
 * ADD-ON MODULES.
 *
 * Add-ons stack on top of the base subscription. Each one is a self-contained
 * module: give it an id, a price, a billing period and copy, and it shows up in
 * the Store and in the subscription screen's running monthly total. Adding a
 * new module later means adding one entry to this list — nothing else.
 */

export type AddonId = "voiceHandoff" | "documents";

export type Addon = {
  id: AddonId;
  name: string;
  tagline: string;
  /** monthly add-ons appear in the running monthly total; one-time do not. */
  billing: "monthly" | "one-time";
  price: number;
  priceLabel: string;
  blurb: string;
  includes: string[];
  /** Route the driver uses the add-on from. */
  href: string;
  /** True when there is no per-order fee — stated plainly to the driver. */
  noPerOrderFee?: boolean;
};

export const addons: Addon[] = [
  {
    id: "voiceHandoff",
    name: "Voice Hand-Off Ordering",
    tagline: "Order by voice, hand off into the app ready to submit",
    billing: "monthly",
    price: 5,
    priceLabel: "$5.00 / month",
    blurb:
      "You never touch the phone to build the order. HERCULES takes it by voice, reads it back, then opens the delivery app with the whole cart pre-filled at your position — you just hit submit. The platform takes the payment, not HERCULES.",
    includes: [
      "Voice ordering for Uber Eats, DoorDash, Grubhub, Instacart, GoPuff, Walmart, Walgreens, CVS, Amazon",
      "Read-back confirmation before anything is handed off",
      "Cart, address and meet note pre-filled — dock, bay, gate or lot",
      "Coverage checked where you sit, with the nearest covered point ahead",
      "No HERCULES per-order fee — the app charges you directly",
    ],
    href: "/supply",
    noPerOrderFee: true,
  },
  {
    id: "documents",
    name: "Document Upload",
    tagline: "Scan and send BOLs, PODs, scale tickets and receipts",
    billing: "one-time",
    price: 5,
    priceLabel: "$5.00 one time",
    blurb:
      "Multipage capture with edge detection, rotate, tag and group by load, then send to your broker, factor or dispatcher on your word. Bought once, yours for good — not a subscription.",
    includes: [
      "Multipage grouping by load ID",
      "Crop, straighten, rotate, remove pages",
      "Tag as BOL, POD, scale ticket, lumper, receipt",
      "Explicit Send-to confirmation every time",
    ],
    href: "/documents",
  },
];

export function addonById(id: AddonId): Addon {
  const found = addons.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown add-on: ${id}`);
  return found;
}

export const monthlyAddons = addons.filter((a) => a.billing === "monthly");
export const oneTimeAddons = addons.filter((a) => a.billing === "one-time");
