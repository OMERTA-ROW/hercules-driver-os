/**
 * ACCOUNT STRUCTURE
 * =================
 * HERCULES and ZEUS run on one shared data model with separate login doors and
 * separate permission scopes.
 *
 *  1. HERCULES SOLO           — owner-operator, full self-managed app (flagship)
 *  2. HERCULES COMPANY DRIVER — driver at an outside company, subscribes alone
 *  3. ZEUS FLEET              — the company side, onboards its own fleet and
 *                               links drivers by invite or company code
 */

import type { PlanId } from "./plans";

export type AccountKind = "solo" | "companyDriver" | "zeusFleet";

/** Permission scopes — what a door is allowed to reach in the shared model. */
export type Scope =
  | "self.truck"
  | "self.money"
  | "self.loads"
  | "self.documents"
  | "company.linked"
  | "fleet.trucks"
  | "fleet.drivers"
  | "fleet.onboarding"
  | "fleet.billing";

export type Door = {
  kind: AccountKind;
  brand: "HERCULES" | "ZEUS";
  name: string;
  who: string;
  /** Which subscription tier this door signs into. */
  plan: PlanId;
  price: string;
  scopes: Scope[];
  /** What this door explicitly cannot do. */
  limits: string[];
};

export const doors: Door[] = [
  {
    kind: "solo",
    brand: "HERCULES",
    name: "HERCULES Solo",
    who: "Owner-operator. Full app, self-managed, no company attached.",
    plan: "owner",
    price: "$29/month",
    scopes: ["self.truck", "self.money", "self.loads", "self.documents"],
    limits: ["No company oversight — the account answers to you alone"],
  },
  {
    kind: "companyDriver",
    brand: "HERCULES",
    name: "HERCULES Company Driver",
    who: "You drive for an outside company and pay for HERCULES yourself.",
    plan: "company",
    price: "$5–10/month",
    scopes: ["self.truck", "self.documents", "company.linked"],
    limits: [
      "Flagged as a company driver on the shared model",
      "No load booking or settlement money — that is the carrier's side",
    ],
  },
  {
    kind: "zeusFleet",
    brand: "ZEUS",
    name: "ZEUS Fleet",
    who: "A company onboarding its own fleet and its own drivers into rotation.",
    plan: "fleet",
    price: "$19 per truck / month · 3 truck minimum",
    scopes: [
      "self.truck",
      "self.money",
      "self.loads",
      "self.documents",
      "fleet.trucks",
      "fleet.drivers",
      "fleet.onboarding",
      "fleet.billing",
    ],
    limits: ["Open platform — any outside carrier can onboard its own drivers"],
  },
];

export function doorFor(kind: AccountKind): Door {
  return doors.find((d) => d.kind === kind) ?? doors[0]!;
}

export function hasScope(kind: AccountKind, scope: Scope) {
  return doorFor(kind).scopes.includes(scope);
}

/** Company code a ZEUS fleet hands its drivers to link them into rotation. */
export function makeCompanyCode(company: string) {
  const stem = company.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ZEUS";
  return `${stem}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Mock directory of carriers already onboarded on ZEUS. */
export const knownCompanies = [
  { code: "SOON-4412", name: "Sooner Freight Systems", trucks: 38, drivers: 41 },
  { code: "REDR-8890", name: "Red River Carriers", trucks: 12, drivers: 14 },
  { code: "BASS-1027", name: "Bass Transport LLC", trucks: 3, drivers: 3 },
] as const;

export function companyByCode(code: string) {
  const c = code.trim().toUpperCase();
  return knownCompanies.find((k) => k.code === c) ?? null;
}
