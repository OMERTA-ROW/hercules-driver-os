/**
 * HERCULES navigation mock data.
 *
 * IMPORTANT ARCHITECTURE NOTE
 * ---------------------------
 * Google Maps is used ONLY as the base map + street-level rendering layer.
 * Google Maps does NOT expose commercial-vehicle routing attributes:
 * no bridge/overpass clearances, no posted weight limits, no length/width
 * restrictions, no hazmat class routing, no truck-restricted road flags.
 *
 * Everything in this file that describes truck legality is therefore MOCK
 * data shaped like the response of a commercial routing provider
 * (HERE Routing v8 `transport.truck`, Trimble/PC*MILER, or similar), so a
 * real provider can be dropped in behind `src/lib/truck-routing.ts` without
 * touching any UI. See that file for the adapter contract.
 */

export type LatLng = { lat: number; lng: number };

/** Driver's truck configuration — sent to the truck-routing provider verbatim. */
export const truckProfile = {
  unit: "Unit 4471",
  heightFt: 13.6,
  lengthFt: 70,
  widthIn: 102,
  grossWeightLbs: 79400,
  axles: 5,
  hazmat: "None" as "None" | "Flammable" | "Corrosive" | "Explosive",
  trailerType: "53' Dry Van",
  /** 13'6" tractor-trailer needs 14'0" posted minimum for legal clearance. */
  minClearanceFt: 14.0,
};

/** Route classification drives the on-map shield styling. */
export type RoadClass = "interstate" | "us" | "county";

export type RouteSegment = {
  id: string;
  road: string;
  /** interstate/us => BLUE shield · county/secondary => WHITE shield */
  class: RoadClass;
  shieldAt: LatLng;
  miles: number;
  truckLegal: boolean;
  /** Why this segment is legal (or why it was excluded from the route). */
  clearanceFt: number;
  weightLimitLbs: number;
  note: string;
};

export type RouteStep = {
  id: string;
  at: LatLng;
  inMiles: number;
  text: string;
  lane: string;
  road: string;
  class: RoadClass;
};

export type TruckRoute = {
  id: string;
  label: string;
  polyline: LatLng[];
  steps: RouteStep[];
  segments: RouteSegment[];
  totalMiles: number;
  remainingMiles: number;
  etaLocal: string;
  driveMinutes: number;
  /** Provider that produced this route (mock today, HERE/Trimble tomorrow). */
  provider: string;
};

/** Simplified I-35 / I-44 corridor, Laredo TX -> Oklahoma City OK. */
const mainPolyline: LatLng[] = [
  { lat: 32.7767, lng: -96.797 }, // Dallas
  { lat: 33.1507, lng: -96.8236 }, // Frisco
  { lat: 33.6357, lng: -97.1467 }, // Gainesville
  { lat: 34.1075, lng: -97.1467 }, // Ardmore
  { lat: 34.6087, lng: -97.1478 }, // Pauls Valley
  { lat: 35.0117, lng: -97.3644 }, // Purcell
  { lat: 35.2226, lng: -97.4395 }, // Norman
  { lat: 35.4676, lng: -97.5164 }, // Oklahoma City
];

export const primaryRoute: TruckRoute = {
  id: "RTE-88214-A",
  label: "I-35 N via Ardmore",
  provider: "HERCULES mock truck-routing provider",
  polyline: mainPolyline,
  totalMiles: 662,
  remainingMiles: 214,
  etaLocal: "19:42",
  driveMinutes: 214,
  steps: [
    {
      id: "S1",
      at: { lat: 33.6357, lng: -97.1467 },
      inMiles: 0.4,
      text: "Keep right on I-35 N toward Gainesville",
      lane: "Keep right, 2 lanes",
      road: "I-35",
      class: "interstate",
    },
    {
      id: "S2",
      at: { lat: 34.1075, lng: -97.1467 },
      inMiles: 38,
      text: "Exit 33 toward US-70 W · Ardmore scale ahead",
      lane: "Right exit",
      road: "US-70",
      class: "us",
    },
    {
      id: "S3",
      at: { lat: 35.0117, lng: -97.3644 },
      inMiles: 104,
      text: "Continue on I-35 N toward Purcell",
      lane: "Center lanes",
      road: "I-35",
      class: "interstate",
    },
    {
      id: "S4",
      at: { lat: 35.4676, lng: -97.5164 },
      inMiles: 214,
      text: "Arrive: Dock 14, Oklahoma City OK",
      lane: "Gate on the left",
      road: "SW 15th St (county)",
      class: "county",
    },
  ],
  segments: [
    {
      id: "SEG-1",
      road: "I-35",
      class: "interstate",
      shieldAt: { lat: 33.6357, lng: -97.1467 },
      miles: 96,
      truckLegal: true,
      clearanceFt: 16.4,
      weightLimitLbs: 80000,
      note: "Designated National Network. No posted truck restrictions.",
    },
    {
      id: "SEG-2",
      road: "US-77",
      class: "us",
      shieldAt: { lat: 34.6087, lng: -97.1478 },
      miles: 41,
      truckLegal: true,
      clearanceFt: 15.2,
      weightLimitLbs: 80000,
      note: "Legal alternate. Two rail overpasses, both 15'2\" or better.",
    },
    {
      id: "SEG-3",
      road: "OK-39 (county)",
      class: "county",
      shieldAt: { lat: 35.0117, lng: -97.3644 },
      miles: 12,
      truckLegal: true,
      clearanceFt: 14.6,
      weightLimitLbs: 80000,
      note: "Legal county connector. 40 ft bridge, posted 80,000 lb.",
    },
    {
      id: "SEG-4",
      road: "SW 15th St (county)",
      class: "county",
      shieldAt: { lat: 35.2226, lng: -97.4395 },
      miles: 6,
      truckLegal: true,
      clearanceFt: 14.2,
      weightLimitLbs: 80000,
      note: "Final-mile county route into the dock. Legal for 70 ft.",
    },
  ],
};

/**
 * Roads a commercial provider excludes for THIS truck configuration.
 * The map never draws these — only truck-legal geometry is rendered.
 */
export const excludedRoads = [
  {
    road: "Old Ardmore Rd underpass",
    reason: "Posted 13'2\" clearance — your truck runs 13'6\"",
    kind: "Height",
  },
  {
    road: "Wildhorse Creek Bridge (CR-1290)",
    reason: "Posted 26,000 lb limit — you gross 79,400 lb",
    kind: "Weight",
  },
  {
    road: "Norman Main St business district",
    reason: "Posted no-truck route, 45 ft length maximum",
    kind: "Length",
  },
  {
    road: "US-77 Canadian River tunnel",
    reason: "Hazmat prohibited (not restricting you — no placards)",
    kind: "Hazmat",
  },
  {
    road: "Purcell residential grid",
    reason: "Local delivery only, 96 in width maximum",
    kind: "Width",
  },
] as const;

/** Truck-legal reroute the provider returns after an off-route event. */
export const rerouteOption: TruckRoute = {
  id: "RTE-88214-B",
  label: "US-77 N to OK-39, back to I-35",
  provider: "HERCULES mock truck-routing provider",
  polyline: [
    { lat: 34.6087, lng: -97.0478 },
    { lat: 34.8087, lng: -97.1 },
    { lat: 35.0117, lng: -97.2644 },
    { lat: 35.2226, lng: -97.4395 },
    { lat: 35.4676, lng: -97.5164 },
  ],
  totalMiles: 668,
  remainingMiles: 221,
  etaLocal: "19:58",
  driveMinutes: 226,
  steps: [
    {
      id: "R1",
      at: { lat: 34.6087, lng: -97.0478 },
      inMiles: 0.6,
      text: "Turn left onto US-77 N — truck legal, 15'2\" clearance",
      lane: "Left turn lane",
      road: "US-77",
      class: "us",
    },
    {
      id: "R2",
      at: { lat: 35.0117, lng: -97.2644 },
      inMiles: 18,
      text: "Right onto OK-39 to rejoin I-35 N at Exit 91",
      lane: "Right lane",
      road: "OK-39",
      class: "county",
    },
    {
      id: "R3",
      at: { lat: 35.2226, lng: -97.4395 },
      inMiles: 74,
      text: "Continue I-35 N toward Oklahoma City",
      lane: "Center lanes",
      road: "I-35",
      class: "interstate",
    },
    {
      id: "R4",
      at: { lat: 35.4676, lng: -97.5164 },
      inMiles: 221,
      text: "Arrive: Dock 14, Oklahoma City OK",
      lane: "Gate on the left",
      road: "SW 15th St (county)",
      class: "county",
    },
  ],
  segments: primaryRoute.segments,
};

/** Off-route GPS breadcrumb used to demo automatic recalculation. */
export const offRoutePosition: LatLng = { lat: 34.6087, lng: -97.0478 };

/** Parking + facility intelligence surfaced on the nav screen (matches load board). */
export const routeParking = [
  {
    name: "Love's #412 — I-35 Exit 137",
    milesAhead: 34,
    spots: "62 truck spots · 9 open",
    overnight: true,
    note: "Paved, lit, easy pull-through. Reserved row available.",
  },
  {
    name: "Pauls Valley rest area — I-35 N",
    milesAhead: 78,
    spots: "18 truck spots · unmetered",
    overnight: true,
    note: "No amenities. Fine for a 30-minute break.",
  },
  {
    name: "Receiver on-site — Dock 14",
    milesAhead: 214,
    spots: "On-site parking, overnight NOT allowed",
    overnight: false,
    note: "Nearest safe parking: TA OKC East, 4.2 mi.",
  },
] as const;

export const destinationFacility = {
  name: "Sooner Bottling Receiving · Dock 14",
  open: "06:00",
  close: "22:00",
  hours24: false,
  weekend: "Closed Sunday",
  appointment: "Appointment" as const,
  onSiteParking: true,
  overnightAllowed: false,
  nearestSafeParking: "TA OKC East, I-40 Exit 157",
  nearestSafeParkingMiles: 4.2,
};
