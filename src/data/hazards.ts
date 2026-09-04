/**
 * TRUCK HAZARD DATA LAYER (mock).
 *
 * Shaped like a commercial truck-attribute feed (HERE Truck Attributes,
 * Trimble/PC*MILER RoadNet hazards, INRIX, or a state DOT bridge-clearance
 * dataset) so a live provider can be plugged in behind
 * `src/lib/hazards.tsx` without touching the map or warning UI.
 *
 * Google Maps supplies none of this: no posted clearances, no grade percentages,
 * no runaway ramps, no rough-crossing flags, no scale status.
 */

import type { LatLng } from "./routing";

export type HazardKind =
  | "clearance"
  | "grade"
  | "switchback"
  | "runaway"
  | "emergencyExit"
  | "scale"
  | "railroad";

export type Hazard = {
  id: string;
  kind: HazardKind;
  name: string;
  at: LatLng;
  /** Distance ahead of the truck along the route, in miles (mock GPS-relative). */
  milesAhead: number;
  /** Distance at which the proactive warning starts firing. */
  warnAtMiles: number;
  detail: string;
  /** Spoken form — read aloud well before the hazard. */
  speech: string;
  /** Posted clearance in feet, clearance hazards only. */
  clearanceFt?: number;
  /** Signed grade percent (negative = descending) and length in miles. */
  gradePct?: number;
  gradeMiles?: number;
  /** Posted weight limit in pounds, where the hazard is weight-gated. */
  weightLimitLbs?: number;
  /** Posted maximum length in feet, where the hazard is length-gated. */
  maxLengthFt?: number;
  scaleStatus?: "Open" | "Closed" | "Unknown";
  severity: "info" | "caution" | "critical";
};

export const hazardMeta: Record<
  HazardKind,
  { label: string; short: string; blurb: string }
> = {
  clearance: {
    label: "Low bridge clearances",
    short: "Clearance",
    blurb: "Posted overpass and viaduct heights, including dense urban clearance grids.",
  },
  grade: {
    label: "Steep grades",
    short: "Grade",
    blurb: "Ascending and descending grades with percent and length, warned before the descent.",
  },
  switchback: {
    label: "Switchbacks & tight curves",
    short: "Switchback",
    blurb: "Mountain switchbacks and curves too tight for a 53-foot trailer at speed.",
  },
  runaway: {
    label: "Runaway truck ramps",
    short: "Runaway ramp",
    blurb: "Escape ramps, surfaced automatically on any marked descent.",
  },
  emergencyExit: {
    label: "Emergency county exits & pull-offs",
    short: "Pull-off",
    blurb: "Legal county exits and shoulders wide enough to get off the road.",
  },
  scale: {
    label: "Weigh scales",
    short: "Scale",
    blurb: "Fixed scale houses with open or closed status when reported.",
  },
  railroad: {
    label: "Rough railroad crossings",
    short: "Crossing",
    blurb: "High-center and rough crossings where a low trailer can hang up.",
  },
};

export const hazardKinds = Object.keys(hazardMeta) as HazardKind[];

export const hazards: Hazard[] = [
  // --- Dense urban clearance coverage (Chicago viaduct grid) ---
  {
    id: "HZ-CLR-1",
    kind: "clearance",
    name: "Lower Wacker Dr viaduct — Chicago, IL",
    at: { lat: 35.19, lng: -97.62 },
    milesAhead: 6,
    warnAtMiles: 12,
    detail: "Posted 12'0\" — urban viaduct grid, 14 low structures within 2 miles",
    speech:
      "Low clearance in six miles. Lower Wacker viaduct posted twelve foot zero. Your truck stands thirteen six. Do not enter. I have a legal line around it.",
    clearanceFt: 12.0,
    severity: "critical",
  },
  {
    id: "HZ-CLR-2",
    kind: "clearance",
    name: "S Archer Ave rail underpass — Chicago, IL",
    at: { lat: 35.05, lng: -97.05 },
    milesAhead: 22,
    warnAtMiles: 25,
    detail: "Posted 13'3\" — arched deck, center lane only clears",
    speech:
      "Low clearance in twenty two miles. Archer Avenue underpass posted thirteen foot three. Tight for your thirteen six.",
    clearanceFt: 13.25,
    severity: "critical",
  },
  {
    id: "HZ-CLR-3",
    kind: "clearance",
    name: "I-35 Exit 91 overpass",
    at: { lat: 34.9, lng: -97.55 },
    milesAhead: 41,
    warnAtMiles: 20,
    detail: "Posted 14'6\" — clears your configuration",
    speech: "Overpass ahead posted fourteen six. You clear it.",
    clearanceFt: 14.5,
    severity: "info",
  },

  // --- Grades + the ramps that belong to them ---
  {
    id: "HZ-GRD-1",
    kind: "grade",
    name: "Jellico Mountain descent — I-75, TN",
    at: { lat: 34.62, lng: -96.92 },
    milesAhead: 14,
    warnAtMiles: 25,
    detail: "6% descending, 5.4 miles · gear down before the crest",
    speech:
      "Steep descent in fourteen miles. Jellico Mountain, six percent down for five point four miles. At seventy nine thousand pounds, pick your gear before the crest. Two runaway ramps on the way down.",
    gradePct: -6,
    gradeMiles: 5.4,
    weightLimitLbs: 80000,
    severity: "critical",
  },
  {
    id: "HZ-GRD-2",
    kind: "grade",
    name: "Arbuckle grade — I-35 N",
    at: { lat: 34.2, lng: -97.68 },
    milesAhead: 58,
    warnAtMiles: 20,
    detail: "4% ascending, 2.1 miles · expect to lose road speed",
    speech: "Four percent climb in fifty eight miles, two miles long. Build your speed early.",
    gradePct: 4,
    gradeMiles: 2.1,
    severity: "caution",
  },
  {
    id: "HZ-RUN-1",
    kind: "runaway",
    name: "Runaway ramp — mile 161, left shoulder",
    at: { lat: 34.58, lng: -97.35 },
    milesAhead: 16,
    warnAtMiles: 25,
    detail: "Gravel arrester bed, 700 ft · 1.8 mi into the descent",
    speech: "First escape ramp is one point eight miles into the descent, left shoulder.",
    severity: "info",
  },
  {
    id: "HZ-RUN-2",
    kind: "runaway",
    name: "Runaway ramp — mile 158, left shoulder",
    at: { lat: 34.54, lng: -97.22 },
    milesAhead: 19,
    warnAtMiles: 25,
    detail: "Gravel arrester bed, 900 ft · last ramp before the bottom",
    speech: "Last escape ramp four point six miles into the descent, left shoulder.",
    severity: "info",
  },

  // --- Switchbacks ---
  {
    id: "HZ-SWB-1",
    kind: "switchback",
    name: "US-129 switchbacks — Tellico Plains, TN",
    at: { lat: 34.75, lng: -96.88 },
    milesAhead: 31,
    warnAtMiles: 30,
    detail: "11 hairpins, 15 mph posted · not advised over 48 ft",
    speech:
      "Switchback section in thirty one miles. Eleven hairpins posted fifteen miles an hour, not advised over forty eight feet. Your trailer is fifty three. I can route you around it.",
    maxLengthFt: 48,
    severity: "critical",
  },
  {
    id: "HZ-SWB-2",
    kind: "switchback",
    name: "TN-33 tight curve series",
    at: { lat: 34.45, lng: -97.72 },
    milesAhead: 47,
    warnAtMiles: 20,
    detail: "5 curves under 25 mph advisory, off-tracking on the inside line",
    speech: "Tight curve series in forty seven miles, twenty five mile an hour advisory.",
    severity: "caution",
  },

  // --- Emergency county exits and pull-offs ---
  {
    id: "HZ-EXT-1",
    kind: "emergencyExit",
    name: "CR-1520 emergency exit — paved, truck legal",
    at: { lat: 34.35, lng: -97.42 },
    milesAhead: 26,
    warnAtMiles: 15,
    detail: "Paved pull-off, 6 truck lengths, cell coverage good",
    speech: "Emergency pull-off in twenty six miles, paved, room for six trucks.",
    severity: "info",
  },
  {
    id: "HZ-EXT-2",
    kind: "emergencyExit",
    name: "Wide shoulder pull-off — mile 143",
    at: { lat: 34.28, lng: -96.95 },
    milesAhead: 37,
    warnAtMiles: 15,
    detail: "Gravel shoulder, 2 truck lengths, no lighting",
    speech: "Gravel pull-off in thirty seven miles, room for two trucks, no lights.",
    severity: "info",
  },

  // --- Scales ---
  {
    id: "HZ-SCL-1",
    kind: "scale",
    name: "Ardmore scale house — I-35 N",
    at: { lat: 34.11, lng: -97.58 },
    milesAhead: 34,
    warnAtMiles: 30,
    detail: "Open · both bays running, bypass not in service",
    speech:
      "Ardmore scale is open in thirty four miles. Time to get your paperwork and pre-trip in order and roll through prepared and compliant.",
    scaleStatus: "Open",
    severity: "caution",
  },
  {
    id: "HZ-SCL-2",
    kind: "scale",
    name: "Purcell port of entry",
    at: { lat: 35.01, lng: -97.18 },
    milesAhead: 71,
    warnAtMiles: 25,
    detail: "Closed as of 30 minutes ago · driver reported",
    speech: "Purcell scale reported closed, seventy one miles out.",
    scaleStatus: "Closed",
    severity: "info",
  },

  // --- Rough railroad crossings ---
  {
    id: "HZ-RRX-1",
    kind: "railroad",
    name: "Rough crossing — Main St, Pauls Valley OK",
    at: { lat: 34.61, lng: -96.9 },
    milesAhead: 12,
    warnAtMiles: 15,
    detail: "High-center hump, 3 low-trailer hang-ups reported this year",
    speech:
      "Rough railroad crossing in twelve miles at Main Street, Pauls Valley. High center. Take it slow and square if you are loaded low.",
    severity: "caution",
  },
  {
    id: "HZ-RRX-2",
    kind: "railroad",
    name: "Rough crossing — CR-1290 spur",
    at: { lat: 34.9, lng: -97.62 },
    milesAhead: 44,
    warnAtMiles: 15,
    detail: "Broken approach slab, 10 mph advisable",
    speech: "Rough crossing in forty four miles, broken approach, ten miles an hour.",
    severity: "caution",
  },
];
