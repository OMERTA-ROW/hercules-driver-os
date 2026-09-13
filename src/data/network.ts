/**
 * SHARED NETWORK DATA MODEL
 * =========================
 * One model, three audiences: the driver sees their own row, the dispatcher sees
 * the fleet, the broker sees the lane. Mock data only — every field here is what
 * a real feed would supply, so this module can be lifted into a separate
 * dispatch/broker app without touching HERCULES driver components.
 */

import type { EighteenSub, VehicleKind } from "./vehicles";

/* ------------------------------------------------------------------ *
 * FLEET-WIDE TRUCK STATE (dispatcher scope)
 * ------------------------------------------------------------------ */

export type TruckStatus =
  "rolling" | "loading" | "unloading" | "detained" | "break" | "reset" | "empty" | "down";

export const truckStatusLabel: Record<TruckStatus, string> = {
  rolling: "Rolling",
  loading: "Loading",
  unloading: "Unloading",
  detained: "Detained",
  break: "On break",
  reset: "34-hour reset",
  empty: "Empty — HERCULES searching",
  down: "Down",
};

export type NetworkTruck = {
  id: string;
  unit: string;
  driver: string;
  companyCode: string;
  /** Active vehicle profile for the trip — asked or inherited. */
  profile: { kind: VehicleKind; sub?: EighteenSub; label: string };
  status: TruckStatus;
  /** Where it is right now. */
  lat: number;
  lng: number;
  place: string;
  /** Minutes of drive clock left. */
  hosMin: number;
  /** Load currently under the wheels, if any. */
  loadId?: string;
  speedMph: number;
};

export const networkTrucks: NetworkTruck[] = [
  {
    id: "t-114",
    unit: "T-114",
    driver: "V. Bass",
    companyCode: "SOON-4412",
    profile: { kind: "eighteen", sub: "dryVan", label: "18-Wheeler · Dry Van" },
    status: "rolling",
    lat: 33.62,
    lng: -97.14,
    place: "I-35 N · MM 483, TX",
    hosMin: 246,
    loadId: "L-88214",
    speedMph: 63,
  },
  {
    id: "t-207",
    unit: "T-207",
    driver: "M. Duarte",
    companyCode: "SOON-4412",
    profile: { kind: "eighteen", sub: "flatbed", label: "18-Wheeler · Flatbed" },
    status: "detained",
    lat: 32.78,
    lng: -96.79,
    place: "Dallas, TX · Dock 14",
    hosMin: 118,
    loadId: "L-88190",
    speedMph: 0,
  },
  {
    id: "t-233",
    unit: "T-233",
    driver: "R. Cole",
    companyCode: "SOON-4412",
    profile: { kind: "eighteen", sub: "intermodal", label: "18-Wheeler · Intermodal" },
    status: "empty",
    lat: 35.22,
    lng: -97.44,
    place: "Norman, OK",
    hosMin: 402,
    speedMph: 0,
  },
  {
    id: "t-318",
    unit: "T-318",
    driver: "J. Whitlow",
    companyCode: "SOON-4412",
    profile: { kind: "heavyHaul", label: "Heavy Haul" },
    status: "reset",
    lat: 35.47,
    lng: -97.52,
    place: "Oklahoma City, OK",
    hosMin: 660,
    speedMph: 0,
  },
  {
    id: "t-401",
    unit: "T-401",
    driver: "D. Okoro",
    companyCode: "SOON-4412",
    profile: { kind: "carHaul", label: "Car Haul" },
    status: "rolling",
    lat: 34.18,
    lng: -97.13,
    place: "I-35 N · MM 42, OK",
    hosMin: 310,
    loadId: "L-88231",
    speedMph: 61,
  },
  {
    id: "t-455",
    unit: "T-455",
    driver: "A. Reyes",
    companyCode: "SOON-4412",
    profile: { kind: "eighteen", sub: "lineHaul", label: "18-Wheeler · Line Haul" },
    status: "down",
    lat: 33.1,
    lng: -97.03,
    place: "I-35 S · MM 461, TX",
    hosMin: 205,
    loadId: "L-88208",
    speedMph: 0,
  },
  {
    id: "t-512",
    unit: "T-512",
    driver: "K. Lindqvist",
    companyCode: "SOON-4412",
    profile: { kind: "cargoVan", label: "Cargo Van" },
    status: "rolling",
    lat: 32.95,
    lng: -96.6,
    place: "US-75 N · Plano, TX",
    hosMin: 388,
    loadId: "L-88244",
    speedMph: 54,
  },
  {
    id: "t-560",
    unit: "T-560",
    driver: "P. Tran",
    companyCode: "SOON-4412",
    profile: { kind: "eighteen", sub: "dryVan", label: "18-Wheeler · Dry Van" },
    status: "loading",
    lat: 35.05,
    lng: -97.03,
    place: "Pauls Valley, OK",
    hosMin: 291,
    loadId: "L-88252",
    speedMph: 0,
  },
];

/* ------------------------------------------------------------------ *
 * LOADS HERCULES MATCHED AND ROUTED ON ITS OWN
 * The reasoning is part of the record. A dispatcher supervising machine
 * dispatch has to be able to read why, not just what.
 * ------------------------------------------------------------------ */

export type MatchedLoad = {
  id: string;
  broker: string;
  origin: string;
  destination: string;
  miles: number;
  rate: number;
  equipment: string;
  pickup: string;
  delivery: string;
  assignedUnit: string;
  driver: string;
  /** Where the load is in its life. */
  stage: "matched" | "accepted" | "picked" | "transit" | "delivered";
  /** Why HERCULES picked this truck for this load. Shown, never hidden. */
  reasoning: string[];
  /** Profit per mile HERCULES projected at match time. */
  ppm: number;
  routedBy: "HERCULES";
};

export const matchedLoads: MatchedLoad[] = [
  {
    id: "L-88214",
    broker: "Meridian Freight Brokers",
    origin: "Dallas, TX",
    destination: "Kansas City, MO",
    miles: 552,
    rate: 1_710,
    equipment: "Dry van 53'",
    pickup: "Today 14:00–16:00",
    delivery: "Tomorrow 08:00–12:00",
    assignedUnit: "T-114",
    driver: "V. Bass",
    stage: "transit",
    ppm: 2.43,
    reasoning: [
      "T-114 profile is dry van — equipment matches the posting exactly",
      "246 minutes of drive clock covers the 4h 40m leg to the 10-hour break",
      "Legal I-35 routing with 14'0\" clearance on every structure",
      "Deadhead 12 miles — lowest of the four eligible units",
      "Rate is $0.31/mi over the lane's 30-day average",
    ],
    routedBy: "HERCULES",
  },
  {
    id: "L-88231",
    broker: "Bluestem Logistics",
    origin: "Fort Worth, TX",
    destination: "Wichita, KS",
    miles: 418,
    rate: 1_380,
    equipment: "Car haul, 7-car",
    pickup: "Today 18:00–20:00",
    delivery: "Tomorrow 12:00–15:00",
    assignedUnit: "T-401",
    driver: "D. Okoro",
    stage: "accepted",
    ppm: 2.28,
    reasoning: [
      "Only car-haul profile inside 90 miles of the origin",
      "Route avoids the 13'6\" structure on OK-9 — car haul rides 14'0\"",
      "Delivery window clears with 96 minutes of clock to spare",
    ],
    routedBy: "HERCULES",
  },
  {
    id: "L-88244",
    broker: "Meridian Freight Brokers",
    origin: "Plano, TX",
    destination: "Tulsa, OK",
    miles: 262,
    rate: 690,
    equipment: "Cargo van",
    pickup: "Today 15:30",
    delivery: "Today 21:00",
    assignedUnit: "T-512",
    driver: "K. Lindqvist",
    stage: "picked",
    ppm: 1.94,
    reasoning: [
      "Van profile — county and back roads are legal, so the short cut is allowed",
      "Expedite window is tight; van beats the tractor by 41 minutes",
      "No clearance or weight checks apply to this profile",
    ],
    routedBy: "HERCULES",
  },
  {
    id: "L-88252",
    broker: "Chisholm Trail Freight",
    origin: "Pauls Valley, OK",
    destination: "Springfield, MO",
    miles: 344,
    rate: 1_050,
    equipment: "Dry van 53'",
    pickup: "Today 12:00–14:00",
    delivery: "Tomorrow 07:00–11:00",
    assignedUnit: "T-560",
    driver: "P. Tran",
    stage: "matched",
    ppm: 2.11,
    reasoning: [
      "Truck is already at the shipper — zero deadhead",
      "Backhaul pairs with L-88266 out of Springfield, keeping the unit loaded",
      "Scale house at MM 96 is open; unit is 2,400 lbs under gross",
    ],
    routedBy: "HERCULES",
  },
];

/* ------------------------------------------------------------------ *
 * EXCEPTIONS — the dispatcher's actual queue
 * ------------------------------------------------------------------ */

export type ExceptionKind = "breakdown" | "detention" | "hos" | "loadFellThrough" | "hazard";

export const exceptionLabel: Record<ExceptionKind, string> = {
  breakdown: "Breakdown",
  detention: "Detention",
  hos: "Hours running out",
  loadFellThrough: "Load fell through",
  hazard: "Hazard blocking route",
};

export type NetworkException = {
  id: string;
  kind: ExceptionKind;
  severity: "critical" | "warn" | "watch";
  unit: string;
  driver: string;
  loadId?: string;
  what: string;
  /** What HERCULES already did about it, without being asked. */
  hercules: string;
  /** Intervention offered to the dispatcher — an exception action, not a desk job. */
  override: string;
  opened: string;
};

export const networkExceptions: NetworkException[] = [
  {
    id: "X-1",
    kind: "breakdown",
    severity: "critical",
    unit: "T-455",
    driver: "A. Reyes",
    loadId: "L-88208",
    what: "Aftertreatment derate, 5 mph limit. Stopped on the I-35 S shoulder at MM 461.",
    hercules:
      "Read the fault off THE BOLT, ranked three mobile repair units, and staged a re-match of L-88208 to T-560 if repair runs past 16:40.",
    override: "Authorise the tow instead of mobile repair",
    opened: "27 min ago",
  },
  {
    id: "X-2",
    kind: "detention",
    severity: "warn",
    unit: "T-207",
    driver: "M. Duarte",
    loadId: "L-88190",
    what: "Held at Dallas Dock 14 for 3h 12m. Detention started at 2 hours.",
    hercules:
      "Logged detention with timestamps, notified the broker, and moved the next pickup window back 90 minutes.",
    override: "Pull the truck off the dock and re-match",
    opened: "3h 12m ago",
  },
  {
    id: "X-3",
    kind: "hos",
    severity: "warn",
    unit: "T-207",
    driver: "M. Duarte",
    what: "118 minutes of drive clock left with 214 miles to the receiver.",
    hercules:
      "Reserved parking at the Love's at MM 402 and proposed a split so the delivery window still holds.",
    override: "Re-match the delivery to a fresh unit",
    opened: "18 min ago",
  },
  {
    id: "X-4",
    kind: "loadFellThrough",
    severity: "watch",
    unit: "T-233",
    driver: "R. Cole",
    what: "Shipper cancelled L-88177 at the door. Unit is empty in Norman, OK.",
    hercules:
      "Found four intermodal-legal loads inside 60 miles and ranked them by profit per mile. Top match is ready for the driver to approve.",
    override: "Hold the truck for a customer-priority load",
    opened: "42 min ago",
  },
  {
    id: "X-5",
    kind: "hazard",
    severity: "critical",
    unit: "T-318",
    driver: "J. Whitlow",
    what: "13'2\" clearance on the OK-9 detour — the heavy haul rides 15'6\".",
    hercules:
      "Blocked the detour, rebuilt a legal route via I-40, and flagged the 6% grade with the runaway ramp at MM 141.",
    override: "Request a state permit for the restricted structure",
    opened: "9 min ago",
  },
];

/* ------------------------------------------------------------------ *
 * BROKER SIDE — postings, lane matches, facility intelligence
 * ------------------------------------------------------------------ */

export type LoadStage = "posted" | "accepted" | "picked" | "transit" | "delivered";

export const loadStages: LoadStage[] = ["posted", "accepted", "picked", "transit", "delivered"];

export const loadStageLabel: Record<LoadStage, string> = {
  posted: "Posted",
  accepted: "Accepted",
  picked: "Picked up",
  transit: "In transit",
  delivered: "Delivered",
};

export type PostedLoad = {
  id: string;
  broker: string;
  origin: string;
  destination: string;
  miles: number;
  rate: number;
  equipment: string;
  pickupWindow: string;
  deliveryWindow: string;
  stage: LoadStage;
  /** Who took it, once accepted. */
  takenBy?: { name: string; unit: string; kind: "fleet" | "ownerOperator" };
  notes?: string;
  postedAt: string;
};

export const seedPostings: PostedLoad[] = [
  {
    id: "P-4401",
    broker: "Meridian Freight Brokers",
    origin: "Dallas, TX",
    destination: "Kansas City, MO",
    miles: 552,
    rate: 1_710,
    equipment: "Dry van 53'",
    pickupWindow: "Today 14:00–16:00",
    deliveryWindow: "Tomorrow 08:00–12:00",
    stage: "transit",
    takenBy: { name: "Sooner Freight Systems", unit: "T-114", kind: "fleet" },
    postedAt: "Today 09:12",
  },
  {
    id: "P-4402",
    broker: "Meridian Freight Brokers",
    origin: "Plano, TX",
    destination: "Tulsa, OK",
    miles: 262,
    rate: 690,
    equipment: "Cargo van",
    pickupWindow: "Today 15:30",
    deliveryWindow: "Today 21:00",
    stage: "picked",
    takenBy: { name: "Sooner Freight Systems", unit: "T-512", kind: "fleet" },
    postedAt: "Today 11:40",
  },
  {
    id: "P-4403",
    broker: "Meridian Freight Brokers",
    origin: "Oklahoma City, OK",
    destination: "Denver, CO",
    miles: 680,
    rate: 2_050,
    equipment: "Flatbed, tarped",
    pickupWindow: "Tomorrow 06:00–10:00",
    deliveryWindow: "Fri 08:00–14:00",
    stage: "posted",
    notes: "Coils, tarps required. Receiver will not accept early.",
    postedAt: "Today 13:05",
  },
];

/** Fleets and owner-operators matched or simply available on a lane. */
export type LaneCandidate = {
  id: string;
  name: string;
  kind: "fleet" | "ownerOperator";
  trucks: number;
  equipment: string[];
  /** How the candidate sits against the lane right now. */
  standing: "matched" | "available" | "watching";
  homeLane: string;
  onTimePct: number;
  note: string;
};

export const laneCandidates: LaneCandidate[] = [
  {
    id: "c-1",
    name: "Sooner Freight Systems",
    kind: "fleet",
    trucks: 38,
    equipment: ["Dry van", "Flatbed", "Intermodal"],
    standing: "matched",
    homeLane: "Dallas ⇄ Kansas City",
    onTimePct: 97,
    note: "HERCULES already routed T-114 on this lane today.",
  },
  {
    id: "c-2",
    name: "Red River Carriers",
    kind: "fleet",
    trucks: 12,
    equipment: ["Dry van", "Reefer"],
    standing: "available",
    homeLane: "Fort Worth ⇄ Tulsa",
    onTimePct: 94,
    note: "Three units empty in the origin market tomorrow morning.",
  },
  {
    id: "c-3",
    name: "V. Bass (Owner-Operator)",
    kind: "ownerOperator",
    trucks: 1,
    equipment: ["Dry van"],
    standing: "watching",
    homeLane: "I-35 corridor",
    onTimePct: 99,
    note: "Watching the lane — wants $0.10/mi more than the posted rate.",
  },
  {
    id: "c-4",
    name: "Chisholm Heavy",
    kind: "fleet",
    trucks: 21,
    equipment: ["Flatbed", "Heavy haul"],
    standing: "available",
    homeLane: "OKC ⇄ Denver",
    onTimePct: 91,
    note: "Tarped flatbed capacity for the Denver posting.",
  },
  {
    id: "c-5",
    name: "D. Okoro (Owner-Operator)",
    kind: "ownerOperator",
    trucks: 1,
    equipment: ["Car haul"],
    standing: "matched",
    homeLane: "DFW ⇄ Wichita",
    onTimePct: 98,
    note: "Accepted the Wichita car-haul posting 20 minutes ago.",
  },
];

/** Facility intelligence the broker supplies on its own shippers and receivers. */
export type BrokerFacility = {
  id: string;
  name: string;
  role: "shipper" | "receiver";
  address: string;
  hours: string;
  open24: boolean;
  overnightParking: boolean;
  spots: number;
  appointment: boolean;
  avgDetentionMin: number;
  notes: string;
};

export const brokerFacilities: BrokerFacility[] = [
  {
    id: "f-1",
    name: "Meridian DC 4 — Dallas",
    role: "shipper",
    address: "3400 Dowdy Ferry Rd, Dallas, TX",
    hours: "05:00–23:00",
    open24: false,
    overnightParking: true,
    spots: 24,
    appointment: true,
    avgDetentionMin: 46,
    notes: "Check in at the guard shack. Trailer swap available. No overnight before 20:00.",
  },
  {
    id: "f-2",
    name: "Riverbend Foods — Kansas City",
    role: "receiver",
    address: "1120 Chouteau Trafficway, Kansas City, MO",
    hours: "24 hours",
    open24: true,
    overnightParking: false,
    spots: 0,
    appointment: true,
    avgDetentionMin: 92,
    notes: "Lumper fee $148. Park at the TA two miles south — no overnight on site.",
  },
  {
    id: "f-3",
    name: "High Plains Steel — OKC",
    role: "shipper",
    address: "7700 SW 15th St, Oklahoma City, OK",
    hours: "06:00–18:00",
    open24: false,
    overnightParking: true,
    spots: 11,
    appointment: false,
    avgDetentionMin: 38,
    notes: "First come, first loaded. Tarps required year round. Gravel yard — heavy haul fine.",
  },
];

export function laneKey(origin: string, destination: string) {
  return `${origin} → ${destination}`;
}

/** Simple bounding-box projection so a fleet map can be drawn without tiles. */
export const fleetBounds = { minLat: 32.4, maxLat: 35.8, minLng: -98.0, maxLng: -96.2 };

export function projectToBox(lat: number, lng: number) {
  const x = ((lng - fleetBounds.minLng) / (fleetBounds.maxLng - fleetBounds.minLng)) * 100;
  const y = (1 - (lat - fleetBounds.minLat) / (fleetBounds.maxLat - fleetBounds.minLat)) * 100;
  return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
}
