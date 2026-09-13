import type { LatLng } from "./routing";

/**
 * TRUCK STOP / PIT STOP LAYER — mock data.
 *
 * Everything here is shaped the way a commercial truck-stop data feed returns it
 * (chain directory, fuel pricing, parking counts, amenity flags) so a real
 * provider — Pilot/Love's/TA developer APIs, Trucker Path, or an aggregator —
 * can be plugged in behind `src/lib/stops.tsx` without touching the UI.
 */

export type ChainId = "pilot" | "loves" | "ta" | "petro" | "quiktrip" | "racetrac" | "independent";

export type Chain = {
  id: ChainId;
  name: string;
  short: string;
  /** Brand marker colors — used for the branded map pin. */
  fill: string;
  text: string;
  loyalty: string | null;
};

export const chains: Chain[] = [
  {
    id: "pilot",
    name: "Pilot / Flying J",
    short: "PFJ",
    fill: "#c8102e",
    text: "#ffffff",
    loyalty: "Pilot myRewards Plus",
  },
  {
    id: "loves",
    name: "Love's Travel Stops",
    short: "LOVE",
    fill: "#f2c200",
    text: "#151005",
    loyalty: "Love's Connect",
  },
  {
    id: "ta",
    name: "TA Travel Center",
    short: "TA",
    fill: "#0a5ca8",
    text: "#ffffff",
    loyalty: "TA Ultra One",
  },
  {
    id: "petro",
    name: "Petro Stopping Center",
    short: "PETRO",
    fill: "#1c8a3c",
    text: "#ffffff",
    loyalty: "TA Ultra One",
  },
  {
    id: "quiktrip",
    name: "QuikTrip",
    short: "QT",
    fill: "#d0202c",
    text: "#ffffff",
    loyalty: "QT Rewards",
  },
  {
    id: "racetrac",
    name: "RaceTrac",
    short: "RT",
    fill: "#e0521c",
    text: "#ffffff",
    loyalty: "RaceTrac Rewards",
  },
  {
    id: "independent",
    name: "Independent truck stop",
    short: "IND",
    fill: "#8b95a1",
    text: "#0b0d10",
    loyalty: null,
  },
];

export function chainOf(id: ChainId): Chain {
  return chains.find((c) => c.id === id) ?? chains[6]!;
}

export type Amenity =
  "showers" | "parking" | "scales" | "food" | "dieselLanes" | "laundry" | "dogArea";

export const amenityLabels: Record<Amenity, string> = {
  showers: "Showers",
  parking: "Truck parking",
  scales: "CAT scale",
  food: "Restaurant",
  dieselLanes: "Truck diesel lanes",
  laundry: "Laundry",
  dogArea: "Pet area",
};

export type TruckStop = {
  id: string;
  chain: ChainId;
  name: string;
  exit: string;
  at: LatLng;
  /** Miles ahead along the CURRENT route — not straight-line distance. */
  milesAhead: number;
  etaMin: number;
  dieselPrice: number;
  /** Discount already applied when a loyalty account is linked. */
  loyaltyDiscount: number;
  parkingTotal: number;
  parkingOpen: number;
  parkingReservable: boolean;
  parkingPrice: number;
  showers: number;
  showersOpen: number;
  showerPrice: number;
  showerWaitMin: number;
  scales: boolean;
  amenities: Amenity[];
  food: string[];
  note: string;
};

export const truckStops: TruckStop[] = [
  {
    id: "stop-loves-412",
    chain: "loves",
    name: "Love's #412",
    exit: "I-35 Exit 137 · Purcell, OK",
    at: { lat: 34.98, lng: -97.36 },
    milesAhead: 34,
    etaMin: 38,
    dieselPrice: 3.649,
    loyaltyDiscount: 0.11,
    parkingTotal: 62,
    parkingOpen: 9,
    parkingReservable: true,
    parkingPrice: 16,
    showers: 8,
    showersOpen: 3,
    showerPrice: 15,
    showerWaitMin: 0,
    scales: true,
    amenities: ["showers", "parking", "scales", "food", "dieselLanes", "laundry", "dogArea"],
    food: ["Arby's", "Subway", "Godfather's Pizza"],
    note: "Paved, lit, pull-through. Reserved row on the north side.",
  },
  {
    id: "stop-pilot-330",
    chain: "pilot",
    name: "Pilot Travel Center #330",
    exit: "I-35 Exit 108 · Pauls Valley, OK",
    at: { lat: 34.74, lng: -97.22 },
    milesAhead: 61,
    etaMin: 68,
    dieselPrice: 3.589,
    loyaltyDiscount: 0.15,
    parkingTotal: 118,
    parkingOpen: 24,
    parkingReservable: true,
    parkingPrice: 18,
    showers: 10,
    showersOpen: 5,
    showerPrice: 15,
    showerWaitMin: 0,
    scales: true,
    amenities: ["showers", "parking", "scales", "food", "dieselLanes", "laundry"],
    food: ["Denny's", "Cinnabon"],
    note: "Big lot, easy in and out southbound. Fuel desk is fast at night.",
  },
  {
    id: "stop-ta-okc-e",
    chain: "ta",
    name: "TA OKC East",
    exit: "I-40 Exit 157 · Oklahoma City, OK",
    at: { lat: 35.44, lng: -97.32 },
    milesAhead: 96,
    etaMin: 108,
    dieselPrice: 3.719,
    loyaltyDiscount: 0.08,
    parkingTotal: 210,
    parkingOpen: 41,
    parkingReservable: true,
    parkingPrice: 20,
    showers: 14,
    showersOpen: 6,
    showerPrice: 16,
    showerWaitMin: 10,
    scales: true,
    amenities: ["showers", "parking", "scales", "food", "dieselLanes", "laundry", "dogArea"],
    food: ["Country Pride", "Popeyes", "Taco Bell"],
    note: "4.2 mi from your receiver. Overnight friendly, security patrol.",
  },
  {
    id: "stop-petro-okc",
    chain: "petro",
    name: "Petro Stopping Center OKC",
    exit: "I-40 Exit 140 · Oklahoma City, OK",
    at: { lat: 35.46, lng: -97.68 },
    milesAhead: 112,
    etaMin: 126,
    dieselPrice: 3.699,
    loyaltyDiscount: 0.08,
    parkingTotal: 165,
    parkingOpen: 12,
    parkingReservable: true,
    parkingPrice: 19,
    showers: 12,
    showersOpen: 2,
    showerPrice: 16,
    showerWaitMin: 25,
    scales: true,
    amenities: ["showers", "parking", "scales", "food", "dieselLanes", "laundry"],
    food: ["Iron Skillet", "Wendy's"],
    note: "Tight fuel island on the west row. Showers fill up after 8pm.",
  },
  {
    id: "stop-qt-1043",
    chain: "quiktrip",
    name: "QuikTrip #1043 (Travel Center)",
    exit: "I-44 Exit 222 · Tulsa, OK",
    at: { lat: 36.12, lng: -95.94 },
    milesAhead: 143,
    etaMin: 162,
    dieselPrice: 3.529,
    loyaltyDiscount: 0.04,
    parkingTotal: 34,
    parkingOpen: 6,
    parkingReservable: false,
    parkingPrice: 0,
    showers: 4,
    showersOpen: 1,
    showerPrice: 12,
    showerWaitMin: 15,
    scales: false,
    amenities: ["showers", "parking", "food", "dieselLanes"],
    food: ["QT Kitchen"],
    note: "Cheapest diesel ahead. Small lot — do not plan a 10-hour break here.",
  },
  {
    id: "stop-racetrac-88",
    chain: "racetrac",
    name: "RaceTrac #88",
    exit: "I-35 Exit 51 · Ardmore, OK",
    at: { lat: 34.21, lng: -97.13 },
    milesAhead: 168,
    etaMin: 190,
    dieselPrice: 3.559,
    loyaltyDiscount: 0.03,
    parkingTotal: 22,
    parkingOpen: 4,
    parkingReservable: false,
    parkingPrice: 0,
    showers: 0,
    showersOpen: 0,
    showerPrice: 0,
    showerWaitMin: 0,
    scales: false,
    amenities: ["parking", "food", "dieselLanes"],
    food: ["Swirl World", "Hot food case"],
    note: "Fuel and food only. No showers. Fine for a quick 30.",
  },
  {
    id: "stop-ind-hickory",
    chain: "independent",
    name: "Hickory Truck Plaza",
    exit: "US-77 · Wynnewood, OK",
    at: { lat: 34.64, lng: -97.16 },
    milesAhead: 74,
    etaMin: 84,
    dieselPrice: 3.499,
    loyaltyDiscount: 0,
    parkingTotal: 46,
    parkingOpen: 19,
    parkingReservable: true,
    parkingPrice: 12,
    showers: 3,
    showersOpen: 3,
    showerPrice: 12,
    showerWaitMin: 0,
    scales: true,
    amenities: ["showers", "parking", "scales", "food"],
    food: ["Home-style diner (24h)"],
    note: "Old lot, gravel back row. Diner is the best food on this stretch.",
  },
];

/** HERCULES booking fee — charged per reservation, always shown as its own line. */
export const BOOKING_FEE = 2;

export type LoyaltyProgram = {
  chain: ChainId;
  program: string;
  /** Real chain APIs / OAuth drop in here later; mocked for now. */
  authKind: "oauth" | "password";
  signInHint: string;
};

export const loyaltyPrograms: LoyaltyProgram[] = [
  {
    chain: "pilot",
    program: "Pilot myRewards Plus",
    authKind: "oauth",
    signInHint: "myRewards number or email",
  },
  {
    chain: "loves",
    program: "Love's Connect",
    authKind: "oauth",
    signInHint: "Love's Connect email",
  },
  {
    chain: "ta",
    program: "TA Ultra One",
    authKind: "password",
    signInHint: "Ultra One card number",
  },
  {
    chain: "quiktrip",
    program: "QT Rewards",
    authKind: "password",
    signInHint: "QT Rewards phone number",
  },
  {
    chain: "racetrac",
    program: "RaceTrac Rewards",
    authKind: "password",
    signInHint: "RaceTrac Rewards email",
  },
];

export type LoyaltyAccount = {
  chain: ChainId;
  program: string;
  memberId: string;
  points: number;
  showerCredits: number;
  fuelDiscount: number;
  tier: string;
  linkedAt: string;
};

/** Mock account payloads returned by the fake chain sign-in. */
export const mockLoyaltyAccounts: Record<ChainId, Omit<LoyaltyAccount, "linkedAt" | "memberId">> = {
  pilot: {
    chain: "pilot",
    program: "Pilot myRewards Plus",
    points: 12480,
    showerCredits: 3,
    fuelDiscount: 0.15,
    tier: "Platinum",
  },
  loves: {
    chain: "loves",
    program: "Love's Connect",
    points: 8210,
    showerCredits: 2,
    fuelDiscount: 0.11,
    tier: "Gold",
  },
  ta: {
    chain: "ta",
    program: "TA Ultra One",
    points: 4360,
    showerCredits: 1,
    fuelDiscount: 0.08,
    tier: "Silver",
  },
  quiktrip: {
    chain: "quiktrip",
    program: "QT Rewards",
    points: 1150,
    showerCredits: 0,
    fuelDiscount: 0.04,
    tier: "Member",
  },
  racetrac: {
    chain: "racetrac",
    program: "RaceTrac Rewards",
    points: 640,
    showerCredits: 0,
    fuelDiscount: 0.03,
    tier: "Member",
  },
  petro: {
    chain: "petro",
    program: "TA Ultra One",
    points: 4360,
    showerCredits: 1,
    fuelDiscount: 0.08,
    tier: "Silver",
  },
  independent: {
    chain: "independent",
    program: "—",
    points: 0,
    showerCredits: 0,
    fuelDiscount: 0,
    tier: "—",
  },
};

export type ReservationKind = "shower" | "parking";

export type Reservation = {
  id: string;
  kind: ReservationKind;
  stopId: string;
  stopName: string;
  chain: ChainId;
  /** Human window, e.g. "Tonight 20:30 – 21:15". */
  window: string;
  base: number;
  fee: number;
  total: number;
  usedShowerCredit: boolean;
  status: "upcoming" | "active" | "cancelled";
  createdAt: string;
};

/** Reservation windows offered by the mock provider. */
export const showerWindows = ["19:00 – 19:45", "20:30 – 21:15", "22:00 – 22:45", "05:30 – 06:15"];
export const parkingWindows = [
  "Tonight 18:00 – 06:00",
  "Tonight 20:00 – 06:00",
  "Tonight 22:00 – 08:00",
];
