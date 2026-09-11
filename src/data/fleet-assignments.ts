/**
 * COMPANY EQUIPMENT ASSIGNMENT
 * ============================
 * In a Tier 2 or Tier 3 fleet the driver does not pick their equipment — the
 * company assigns it. HERCULES reads the assignment off the fleet record and
 * resolves the routing profile silently: no "what are you in today?", the legal
 * roads and hazard filters are simply already correct.
 *
 * Mock records behind the same shape a real fleet/TMS feed would supply.
 */

import {
  makeProfile,
  type EighteenSub,
  type VehicleKind,
  type VehicleProfile,
} from "./vehicles";

export type FleetAssignment = {
  companyCode: string;
  /** Driver identifier as the fleet holds it — email or driver code. */
  driver: string;
  /** Power unit number on the company's board. */
  unit: string;
  /** Trailer or equipment attached to that unit. */
  trailer: string;
  kind: VehicleKind;
  sub?: EighteenSub;
  /** Who set it and when — read back so the driver knows where it came from. */
  assignedBy: string;
};

export const fleetAssignments: FleetAssignment[] = [
  {
    companyCode: "SOON-4412",
    driver: "any",
    unit: "Unit 1188",
    trailer: "Dry van 53' — DV-2204",
    kind: "eighteen",
    sub: "dryVan",
    assignedBy: "Sooner Freight dispatch",
  },
  {
    companyCode: "SOON-4412",
    driver: "intermodal@sooner.com",
    unit: "Unit 1204",
    trailer: "Container chassis — CH-880",
    kind: "eighteen",
    sub: "intermodal",
    assignedBy: "Sooner Freight dispatch",
  },
  {
    companyCode: "REDR-8890",
    driver: "any",
    unit: "Unit 77",
    trailer: "Flatbed 48' — FB-119",
    kind: "flatbed",
    assignedBy: "Red River operations",
  },
  {
    companyCode: "BASS-1027",
    driver: "any",
    unit: "Unit 4471",
    trailer: "Dry van 53' — DV-3",
    kind: "eighteen",
    sub: "dryVan",
    assignedBy: "Bass Transport",
  },
];

/** The assignment the fleet holds for this driver, if the company has one. */
export function assignmentFor(
  companyCode: string | undefined,
  driver: string | undefined,
): FleetAssignment | null {
  if (!companyCode) return null;
  const code = companyCode.trim().toUpperCase();
  const mine = fleetAssignments.find(
    (a) => a.companyCode === code && driver && a.driver.toLowerCase() === driver.toLowerCase(),
  );
  const anyForCompany = fleetAssignments.find((a) => a.companyCode === code && a.driver === "any");
  if (mine || anyForCompany) return mine ?? anyForCompany!;
  /* A carrier that just onboarded has no board yet — it still assigns equipment
     at the company level, so HERCULES inherits a default tractor-trailer rather
     than asking the driver. */
  return {
    companyCode: code,
    driver: "any",
    unit: "Company unit",
    trailer: "Dry van 53'",
    kind: "eighteen",
    sub: "dryVan",
    assignedBy: "Company assignment",
  };
}

/** The routing profile that assignment produces. Same shape a driver would save. */
export function profileFromAssignment(a: FleetAssignment): VehicleProfile {
  return {
    ...makeProfile(a.kind, a.sub, a.unit),
    id: `FLEET-${a.companyCode}-${a.unit.replace(/\s+/g, "")}`,
  };
}

export function spokenAssignment(a: FleetAssignment) {
  return `${a.unit} pulling ${a.trailer}, assigned by ${a.assignedBy}`;
}
