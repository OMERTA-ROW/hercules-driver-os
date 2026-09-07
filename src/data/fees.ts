/**
 * WHERE HERCULES ACTUALLY TAKES A FEE.
 *
 * Third-party delivery platforms (DoorDash, Uber Eats, Grubhub, Instacart,
 * GoPuff, Walmart, Walgreens, CVS, Amazon) do not allow anyone else to place
 * or process an order on the driver's behalf. So HERCULES never processes
 * those and never takes a cut of them — it hands the order off into the app,
 * pre-filled, and the platform charges the driver directly.
 *
 * The per-order service fee stays only on the things HERCULES genuinely
 * transacts: parts, tires, roadside service, fuel and DEF, showers and
 * parking, securement supplies. It scales with the order and it is always
 * read aloud and shown before the driver approves anything.
 */

export type FeeCategory =
  | "parts"
  | "tires"
  | "roadside"
  | "fuel"
  | "showerParking"
  | "securement";

export const feeCategories: { id: FeeCategory; label: string; note: string }[] = [
  { id: "parts", label: "Parts", note: "HERCULES sources it, pays the shop, ships it to you" },
  { id: "tires", label: "Tires & casings", note: "Mounted road service or shop order placed by HERCULES" },
  { id: "roadside", label: "Roadside service", note: "Mobile mechanic, tow, tire truck — booked and paid through HERCULES" },
  { id: "fuel", label: "Fuel & DEF", note: "Discounted fuel authorized through HERCULES" },
  { id: "showerParking", label: "Showers & parking", note: "Reserved at the stop through HERCULES" },
  { id: "securement", label: "Securement supplies", note: "Straps, chains, tarps, load bars" },
];

/** Fee bands. Small transaction, small fee. Big parts order, bigger fee — capped. */
export const feeBands: { upTo: number; fee: number; label: string }[] = [
  { upTo: 50, fee: 2, label: "Under $50" },
  { upTo: 150, fee: 6, label: "$50 – $150" },
  { upTo: 400, fee: 15, label: "$150 – $400" },
  { upTo: 1000, fee: 35, label: "$400 – $1,000" },
  { upTo: 2500, fee: 65, label: "$1,000 – $2,500" },
  { upTo: Infinity, fee: 100, label: "Over $2,500" },
];

/** The scaled HERCULES service fee for an amount HERCULES actually transacts. */
export function serviceFeeFor(amount: number): number {
  return feeBands.find((b) => amount <= b.upTo)?.fee ?? 100;
}

/** Plain-English line HERCULES shows and reads out before approval. */
export function feeLine(amount: number): string {
  const fee = serviceFeeFor(amount);
  return `$${fee.toFixed(2)} HERCULES service fee — this is what keeps HERCULES running. It is on this order because HERCULES places and pays it for you.`;
}

/** Delivery hand-offs carry no HERCULES fee. Said plainly, every time. */
export const NO_FEE_HANDOFF =
  "No HERCULES fee on this one. The delivery app charges you directly — HERCULES only fills the order in for you.";
