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

/**
 * Hazards are placed at REAL coordinates on the active I-35 corridor
 * (Dallas TX -> Oklahoma City OK) so every marker lands on the Google Maps
 * layer where the thing actually is — not as a generic icon on a schematic.
 * Which of these the driver sees is filtered by the active vehicle profile.
 */
export const hazards: Hazard[] = [
  // --- Low bridge clearances (shown for EVERY trailer profile) ---
  {
    id: "HZ-CLR-1",
    kind: "clearance",
    name: "BNSF rail underpass — N Weber St, Gainesville TX",
    at: { lat: 33.6289, lng: -97.1338 },
    milesAhead: 6,
    warnAtMiles: 12,
    detail: "Posted 12'4\" — arched deck, no legal line through it for a trailer",
    speech:
      "Low clearance in six miles. Gainesville rail underpass posted twelve foot four. Do not enter with a trailer. I have a legal line around it.",
    clearanceFt: 12.33,
    severity: "critical",
  },
  {
    id: "HZ-CLR-2",
    kind: "clearance",
    name: "US-70 business overpass — Ardmore OK",
    at: { lat: 34.1743, lng: -97.1305 },
    milesAhead: 22,
    warnAtMiles: 25,
    detail: "Posted 13'3\" — center lane clears highest, edges lower",
    speech:
      "Low clearance in twenty two miles. Ardmore business overpass posted thirteen foot three. Tight or illegal for most trailers.",
    clearanceFt: 13.25,
    severity: "critical",
  },
  {
    id: "HZ-CLR-3",
    kind: "clearance",
    name: "I-35 Exit 72 overpass — Davis OK",
    at: { lat: 34.5031, lng: -97.1206 },
    milesAhead: 34,
    warnAtMiles: 20,
    detail: "Posted 14'6\" — clears a standard 13'6\" configuration",
    speech: "Overpass ahead posted fourteen six. Standard trailer clears it.",
    clearanceFt: 14.5,
    severity: "info",
  },
  {
    id: "HZ-CLR-4",
    kind: "clearance",
    name: "Main St viaduct — Purcell OK",
    at: { lat: 35.0154, lng: -97.3611 },
    milesAhead: 63,
    warnAtMiles: 18,
    detail: "Posted 15'0\" — legal for standard height, tight for permitted loads",
    speech:
      "Purcell viaduct posted fifteen foot flat in sixty three miles. Fine standard height, watch it on a permitted load.",
    clearanceFt: 15.0,
    severity: "caution",
  },

  // --- Grades and the ramps that belong to them ---
  {
    id: "HZ-GRD-1",
    kind: "grade",
    name: "Arbuckle Mountains descent — I-35 N, mile 47",
    at: { lat: 34.4342, lng: -97.1223 },
    milesAhead: 28,
    warnAtMiles: 25,
    detail: "6% descending, 4.1 miles · gear down before the crest",
    speech:
      "Steep descent in twenty eight miles. Arbuckle Mountains, six percent down for four miles. Pick your gear before the crest. Two runaway ramps on the way down.",
    gradePct: -6,
    gradeMiles: 4.1,
    weightLimitLbs: 80000,
    severity: "critical",
  },
  {
    id: "HZ-GRD-2",
    kind: "grade",
    name: "Turner Falls climb — I-35 N, mile 51",
    at: { lat: 34.4008, lng: -97.1156 },
    milesAhead: 44,
    warnAtMiles: 20,
    detail: "5% ascending, 2.3 miles · expect to lose road speed",
    speech: "Five percent climb in forty four miles, two miles long. Build your speed early.",
    gradePct: 5,
    gradeMiles: 2.3,
    severity: "caution",
  },
  {
    id: "HZ-RUN-1",
    kind: "runaway",
    name: "Runaway ramp — I-35 N mile 49, left shoulder",
    at: { lat: 34.4211, lng: -97.1198 },
    milesAhead: 30,
    warnAtMiles: 25,
    detail: "Gravel arrester bed, 700 ft · 1.6 mi into the descent",
    speech: "First escape ramp is one point six miles into the descent, left shoulder.",
    severity: "info",
  },
  {
    id: "HZ-RUN-2",
    kind: "runaway",
    name: "Runaway ramp — I-35 N mile 46, left shoulder",
    at: { lat: 34.4507, lng: -97.1241 },
    milesAhead: 32,
    warnAtMiles: 25,
    detail: "Gravel arrester bed, 900 ft · last ramp before the bottom",
    speech: "Last escape ramp three point eight miles into the descent, left shoulder.",
    severity: "info",
  },

  // --- Switchbacks and tight curves ---
  {
    id: "HZ-SWB-1",
    kind: "switchback",
    name: "OK-77S switchbacks — Turner Falls Rd",
    at: { lat: 34.4136, lng: -97.1602 },
    milesAhead: 41,
    warnAtMiles: 30,
    detail: "9 hairpins, 15 mph posted · not advised over 48 ft",
    speech:
      "Switchback section in forty one miles. Nine hairpins posted fifteen miles an hour, not advised over forty eight feet. I can route you around it.",
    maxLengthFt: 48,
    severity: "critical",
  },
  {
    id: "HZ-SWB-2",
    kind: "switchback",
    name: "OK-39 tight curve series — east of Purcell",
    at: { lat: 34.9908, lng: -97.2871 },
    milesAhead: 58,
    warnAtMiles: 20,
    detail: "5 curves under 25 mph advisory, off-tracking on the inside line",
    speech: "Tight curve series in fifty eight miles, twenty five mile an hour advisory.",
    severity: "caution",
  },

  // --- Emergency county exits and pull-offs ---
  {
    id: "HZ-EXT-1",
    kind: "emergencyExit",
    name: "CR-1520 emergency exit — paved, truck legal",
    at: { lat: 34.2664, lng: -97.1382 },
    milesAhead: 26,
    warnAtMiles: 15,
    detail: "Paved pull-off, 6 truck lengths, cell coverage good",
    speech: "Emergency pull-off in twenty six miles, paved, room for six trucks.",
    severity: "info",
  },
  {
    id: "HZ-EXT-2",
    kind: "emergencyExit",
    name: "Wide shoulder pull-off — I-35 N mile 88",
    at: { lat: 34.8319, lng: -97.2196 },
    milesAhead: 52,
    warnAtMiles: 15,
    detail: "Gravel shoulder, 2 truck lengths, no lighting",
    speech: "Gravel pull-off in fifty two miles, room for two trucks, no lights.",
    severity: "info",
  },

  // --- Weigh scales ---
  {
    id: "HZ-SCL-1",
    kind: "scale",
    name: "Thackerville port of entry — I-35 N",
    at: { lat: 33.7871, lng: -97.1408 },
    milesAhead: 18,
    warnAtMiles: 30,
    detail: "Open · both bays running, bypass not in service",
    speech:
      "Thackerville scale is open in eighteen miles. Get your paperwork squared away and roll through prepared.",
    scaleStatus: "Open",
    severity: "caution",
  },
  {
    id: "HZ-SCL-2",
    kind: "scale",
    name: "Purcell weigh station — I-35 N",
    at: { lat: 34.9526, lng: -97.3402 },
    milesAhead: 61,
    warnAtMiles: 25,
    detail: "Closed as of 30 minutes ago · driver reported",
    speech: "Purcell scale reported closed, sixty one miles out.",
    scaleStatus: "Closed",
    severity: "info",
  },
  {
    id: "HZ-SCL-3",
    kind: "scale",
    name: "Wildhorse Creek bridge weight limit — CR-1290",
    at: { lat: 34.5762, lng: -97.0894 },
    milesAhead: 38,
    warnAtMiles: 25,
    detail: "Posted 26,000 lb · county bridge, no permitted loads",
    speech:
      "County bridge in thirty eight miles posted twenty six thousand pounds. Nowhere near legal for a loaded trailer. It is already off your route.",
    weightLimitLbs: 26000,
    severity: "critical",
  },

  // --- Rough railroad crossings ---
  {
    id: "HZ-RRX-1",
    kind: "railroad",
    name: "Rough crossing — Grant Ave, Pauls Valley OK",
    at: { lat: 34.7392, lng: -97.2216 },
    milesAhead: 12,
    warnAtMiles: 15,
    detail: "High-center hump, 3 low-trailer hang-ups reported this year",
    speech:
      "Rough railroad crossing in twelve miles at Grant Avenue, Pauls Valley. High center. Take it slow and square if you are loaded low.",
    severity: "caution",
  },
  {
    id: "HZ-RRX-2",
    kind: "railroad",
    name: "Rough crossing — SW 4th St spur, Norman OK",
    at: { lat: 35.2094, lng: -97.4441 },
    milesAhead: 44,
    warnAtMiles: 15,
    detail: "Broken approach slab, 10 mph advisable",
    speech: "Rough crossing in forty four miles, broken approach, ten miles an hour.",
    severity: "caution",
  },
];

