/**
 * VEHICLE / VOCATION PROFILES
 * ===========================
 * The profile is the core of the routing engine, not a label. Every routing
 * decision, every hazard filter, and every legality check reads from here.
 *
 * A driver can save more than one. When they do, HERCULES asks by voice at the
 * start of every trip — "What are you in today?" — and routes for that answer.
 *
 * Shaped so the values map straight onto a commercial truck-routing request
 * (HERE `transport.truck`, Trimble/PC*MILER vehicle profile).
 */

import type { RoadClass } from "./routing";
import type { HazardKind } from "./hazards";

export type VehicleKind =
  | "car"
  | "passengerVan"
  | "cargoVan"
  | "boxTruck"
  | "flatbed"
  | "eighteen"
  | "carHaul"
  | "heavyHaul";

/** 18-wheeler sub-options — same tractor, different operation and trailer. */
export type EighteenSub = "dryVan" | "lineHaul" | "intermodal" | "flatbed";

export type VehicleSpec = {
  kind: VehicleKind;
  sub?: EighteenSub;
  /** Label read aloud and shown on screen. */
  label: string;
  who: string;
  heightFt: number;
  lengthFt: number;
  widthIn: number;
  grossWeightLbs: number;
  axles: number;
  /** Posted clearance needed to be legal (height + safety margin). */
  minClearanceFt: number;
  /** Anything towing: the routing engine locks to legal truck roads. */
  pullsTrailer: boolean;
};

export const eighteenSubs: { id: EighteenSub; label: string; hint: string }[] = [
  { id: "dryVan", label: "Dry van", hint: "53' box, general freight" },
  { id: "lineHaul", label: "Line haul", hint: "Terminal to terminal, set lanes" },
  { id: "intermodal", label: "Intermodal", hint: "Container on a chassis, rail ramps" },
  { id: "flatbed", label: "Flatbed", hint: "Open deck behind the same tractor" },
];

/** Equipment the driver picks from at setup. */
export const vehicleCatalog: VehicleSpec[] = [
  {
    kind: "car",
    label: "Car / pickup",
    who: "Courier, hotshot deadhead, personal vehicle, dispatch runabout",
    heightFt: 5.5,
    lengthFt: 16,
    widthIn: 76,
    grossWeightLbs: 6000,
    axles: 2,
    minClearanceFt: 6.5,
    pullsTrailer: false,
  },
  {
    kind: "passengerVan",
    label: "Passenger van / minivan",
    who: "Crew transport, shuttle, mobile service call",
    heightFt: 7.0,
    lengthFt: 19,
    widthIn: 78,
    grossWeightLbs: 8600,
    axles: 2,
    minClearanceFt: 8.0,
    pullsTrailer: false,
  },
  {
    kind: "boxTruck",
    label: "Box truck (straight truck)",
    who: "26' straight truck, local and regional freight, liftgate work",
    heightFt: 13.0,
    lengthFt: 30,
    widthIn: 96,
    grossWeightLbs: 26000,
    axles: 2,
    minClearanceFt: 13.5,
    pullsTrailer: false,
  },
  {
    kind: "cargoVan",
    label: "Cargo van / Sprinter",
    who: "Expedite, hotshot parcel, courier freight",
    heightFt: 9.5,
    lengthFt: 22,
    widthIn: 80,
    grossWeightLbs: 9500,
    axles: 2,
    minClearanceFt: 10.0,
    pullsTrailer: false,
  },
  {
    kind: "flatbed",
    label: "Flatbed",
    who: "Open deck, steel, lumber, machinery",
    heightFt: 13.6,
    lengthFt: 70,
    widthIn: 102,
    grossWeightLbs: 78000,
    axles: 5,
    minClearanceFt: 14.0,
    pullsTrailer: true,
  },
  {
    kind: "eighteen",
    sub: "dryVan",
    label: "18-wheeler · Dry van",
    who: "53' box, general freight",
    heightFt: 13.6,
    lengthFt: 70,
    widthIn: 102,
    grossWeightLbs: 79400,
    axles: 5,
    minClearanceFt: 14.0,
    pullsTrailer: true,
  },
  {
    kind: "eighteen",
    sub: "lineHaul",
    label: "18-wheeler · Line haul",
    who: "Terminal to terminal on set lanes",
    heightFt: 13.6,
    lengthFt: 72,
    widthIn: 102,
    grossWeightLbs: 76000,
    axles: 5,
    minClearanceFt: 14.0,
    pullsTrailer: true,
  },
  {
    kind: "eighteen",
    sub: "intermodal",
    label: "18-wheeler · Intermodal",
    who: "Container on a chassis, rail ramp work",
    heightFt: 13.9,
    lengthFt: 68,
    widthIn: 102,
    grossWeightLbs: 78500,
    axles: 5,
    minClearanceFt: 14.5,
    pullsTrailer: true,
  },
  {
    kind: "eighteen",
    sub: "flatbed",
    label: "18-wheeler · Flatbed",
    who: "Open deck behind the same tractor",
    heightFt: 13.6,
    lengthFt: 70,
    widthIn: 102,
    grossWeightLbs: 78000,
    axles: 5,
    minClearanceFt: 14.0,
    pullsTrailer: true,
  },
  {
    kind: "carHaul",
    label: "Car haul",
    who: "Stinger or high-mount auto transport",
    heightFt: 14.0,
    lengthFt: 80,
    widthIn: 102,
    grossWeightLbs: 80000,
    axles: 5,
    minClearanceFt: 14.5,
    pullsTrailer: true,
  },
  {
    kind: "heavyHaul",
    label: "Heavy haul",
    who: "Oversize, overweight, permitted loads",
    heightFt: 15.5,
    lengthFt: 100,
    widthIn: 144,
    grossWeightLbs: 132000,
    axles: 9,
    minClearanceFt: 16.0,
    pullsTrailer: true,
  },
];

/** A profile saved on the driver's account. */
export type VehicleProfile = VehicleSpec & {
  id: string;
  /** Driver's own name for it — "the Pete", "Unit 4471". */
  unit: string;
  hazmat: "None" | "Flammable" | "Corrosive" | "Explosive";
  /** Explicit trailer configuration; absent on legacy/demo profiles. */
  trailerType?: string;
  dimensionsConfirmed?: boolean;
};

export function specKey(kind: VehicleKind, sub?: EighteenSub) {
  return sub ? `${kind}:${sub}` : kind;
}

export function specFor(kind: VehicleKind, sub?: EighteenSub): VehicleSpec {
  return (
    vehicleCatalog.find((v) => specKey(v.kind, v.sub) === specKey(kind, sub)) ?? vehicleCatalog[2]!
  );
}

/* --------------------------------------------------------------- ROUTING RULES */

export type RoutingRules = {
  /** Road classes the router is allowed to put this equipment on. */
  allowedClasses: RoadClass[];
  /** County and back roads open up only for a van-class unit. */
  backRoadsAllowed: boolean;
  /** Hazard kinds that matter for this equipment — the map filters to these. */
  hazardKinds: HazardKind[];
  /** Posted weight-limit and bridge-formula checks (permitted heavy loads). */
  weightRestrictionChecks: boolean;
  /** Steep grade and switchback screening escalated to a hard check. */
  gradeAndSwitchbackChecks: boolean;
  /** Plain-language line HERCULES reads back for this profile. */
  spoken: string;
};

const TRAILER_HAZARDS: HazardKind[] = [
  "clearance",
  "grade",
  "switchback",
  "runaway",
  "emergencyExit",
  "scale",
  "railroad",
];

const VAN_HAZARDS: HazardKind[] = ["clearance", "emergencyExit", "railroad"];

export function rulesFor(spec: VehicleSpec): RoutingRules {
  if (!spec.pullsTrailer) {
    // A straight truck pulls nothing but still stands tall and heavy enough that
    // posted clearances and weight limits matter, so it is not treated like a car.
    // NOTE: no commercial truck-routing provider is connected, so this profile sets
    // preferences and warnings — it is not a verified legal route.
    const tall = spec.minClearanceFt >= 11 || spec.grossWeightLbs >= 16000;
    if (tall) {
      return {
        allowedClasses: ["interstate", "us", "county"],
        backRoadsAllowed: false,
        hazardKinds: ["clearance", "grade", "emergencyExit", "railroad", "scale"],
        weightRestrictionChecks: true,
        gradeAndSwitchbackChecks: false,
        spoken: `${spec.label}. No trailer, but I am watching for anything posted lower than your ${spec.minClearanceFt} feet and for posted weight limits, and I will call them out. Read the posted signs yourself — this is guidance, not a cleared route.`,
      };
    }
    return {
      allowedClasses: ["interstate", "us", "county"],
      backRoadsAllowed: true,
      hazardKinds: VAN_HAZARDS,
      weightRestrictionChecks: false,
      gradeAndSwitchbackChecks: false,
      spoken: `${spec.label}. County roads and back roads are fine for this vehicle, so I will take the short line when it saves time. Posted signs still rule.`,
    };
  }

  const heavy = spec.kind === "heavyHaul";
  return {
    // Blue-shield interstate and white-shield legal county highways only.
    allowedClasses: ["interstate", "us", "county"],
    backRoadsAllowed: false,
    hazardKinds: TRAILER_HAZARDS,
    weightRestrictionChecks: heavy,
    gradeAndSwitchbackChecks: heavy,
    spoken: heavy
      ? "Heavy haul. I keep you on interstate and county highway and call out posted weight limits, grades, switchbacks and low clearances as I see them. Permits and posted signs are yours to read — I am not a permit or legal-route service."
      : `${spec.label}. I keep you on interstate and county highway and speak up on low clearances and restrictions along the way. Read the posted signs — this is guidance, not a verified legal route.`,
  };
}

/** Is this hazard kind shown for the active equipment? */
export function hazardRelevant(kind: HazardKind, spec: VehicleSpec) {
  return rulesFor(spec).hazardKinds.includes(kind);
}

/** Truck-routing provider payload — what a commercial API would receive. */
export function routingPayload(p: VehicleProfile) {
  const rules = rulesFor(p);
  return {
    unit: p.unit,
    heightFt: p.heightFt,
    lengthFt: p.lengthFt,
    widthIn: p.widthIn,
    grossWeightLbs: p.grossWeightLbs,
    axles: p.axles,
    hazmat: p.hazmat,
    minClearanceFt: p.minClearanceFt,
    trailerType: p.trailerType ?? "Unknown",
    allowedClasses: rules.allowedClasses,
    backRoadsAllowed: rules.backRoadsAllowed,
    weightRestrictionChecks: rules.weightRestrictionChecks,
  };
}

export function makeProfile(
  kind: VehicleKind,
  sub: EighteenSub | undefined,
  unit: string,
): VehicleProfile {
  const spec = specFor(kind, sub);
  return {
    ...spec,
    id: `VEH-${specKey(kind, sub)}-${Math.random().toString(36).slice(2, 7)}`,
    unit: unit || "My unit",
    hazmat: "None",
    trailerType: spec.pullsTrailer ? spec.label : "No trailer",
    dimensionsConfirmed: false,
  };
}

/** Default profile so a fresh install still routes like a tractor-trailer. */
export const defaultProfile: VehicleProfile = {
  ...specFor("eighteen", "dryVan"),
  id: "VEH-default",
  unit: "No unit saved yet",
  hazmat: "None",
};
