/**
 * BREAKDOWN ASSIST — mock data layer.
 *
 * Everything here is shaped so a commercial roadside/truck-service data
 * provider (e.g. a heavy-duty service directory, a tow network API, or a
 * chain's service-bay API) can be plugged in behind `src/lib/breakdown.ts`
 * without touching the screens.
 */

export type ProblemId = "tire" | "no-start" | "air" | "def" | "electrical" | "engine" | "unknown";

export type Problem = {
  id: ProblemId;
  label: string;
  /** What the driver actually says. */
  phrases: string[];
  /** Plain-language line HERCULES reads back. */
  spoken: string;
};

export const problems: Problem[] = [
  {
    id: "tire",
    label: "Blown tire",
    phrases: ["blown tire", "flat", "tire", "blowout", "rubber"],
    spoken: "Tire. I'll pull mobile tire service and anyone with a road-service truck first.",
  },
  {
    id: "no-start",
    label: "Won't start",
    phrases: ["won't start", "wont start", "no start", "dead", "crank", "battery"],
    spoken: "No start. Ranking mobile electrical and jump-capable service first.",
  },
  {
    id: "air",
    label: "Air leak",
    phrases: ["air leak", "air", "brakes dropping", "losing air"],
    spoken: "Air leak. Filtering to shops that do air systems and brakes.",
  },
  {
    id: "def",
    label: "DEF / emissions light",
    phrases: ["def", "def light", "emissions", "derate", "regen", "aftertreatment"],
    spoken: "DEF and aftertreatment. Only shops with emissions diagnostic capability.",
  },
  {
    id: "electrical",
    label: "Electrical",
    phrases: ["electrical", "lights", "wiring", "alternator"],
    spoken: "Electrical. Filtering to shops with electrical diagnostics.",
  },
  {
    id: "engine",
    label: "Engine / drivetrain",
    phrases: ["engine", "motor", "coolant", "overheat", "oil", "transmission", "clutch"],
    spoken: "Engine and drivetrain. Heavy-duty shops and mobile diesel techs only.",
  },
  {
    id: "unknown",
    label: "Not sure yet",
    phrases: ["not sure", "don't know", "dont know", "unknown"],
    spoken: "Understood. I'll show everything and read your fault codes so you can describe it.",
  },
];

export type ServiceKind = "mobile" | "shop" | "tow" | "bay";

export type Service = {
  id: string;
  name: string;
  kind: ServiceKind;
  /** Chain id where it's a truck-stop service bay. */
  chain?: "pilot" | "loves" | "ta";
  milesAway: number;
  /** Minutes until they can be at the truck (mobile/tow) or driving time (shop/bay). */
  etaMin: number;
  hours: string;
  open24: boolean;
  phone: string;
  services: ProblemId[];
  note: string;
  /** Mock reputation signal a real provider would supply. */
  rating: number;
  reviews: number;
};

export const services: Service[] = [
  {
    id: "sv-1",
    name: "Ridgeline Mobile Diesel",
    kind: "mobile",
    milesAway: 8.4,
    etaMin: 35,
    hours: "24 hours · 7 days",
    open24: true,
    phone: "(423) 555-0142",
    services: ["engine", "air", "def", "electrical", "no-start"],
    note: "Comes to the truck. Full diagnostic laptop, DEF and air on the van.",
    rating: 4.8,
    reviews: 212,
  },
  {
    id: "sv-2",
    name: "I-40 Truck Tire Road Service",
    kind: "mobile",
    milesAway: 11.2,
    etaMin: 42,
    hours: "24 hours · 7 days",
    open24: true,
    phone: "(423) 555-0198",
    services: ["tire"],
    note: "Road service truck, steer and drive casings on board. Shoulder-safe crew.",
    rating: 4.6,
    reviews: 388,
  },
  {
    id: "sv-3",
    name: "Pilot Travel Center #482 — Service Bay",
    kind: "bay",
    chain: "pilot",
    milesAway: 14.9,
    etaMin: 21,
    hours: "06:00 – 22:00",
    open24: false,
    phone: "(423) 555-0311",
    services: ["tire", "def", "electrical", "air"],
    note: "Two bays, tire service, DEF at the pump. Truck parking on site.",
    rating: 4.1,
    reviews: 96,
  },
  {
    id: "sv-4",
    name: "Love's Truck Care #313",
    kind: "bay",
    chain: "loves",
    milesAway: 22.6,
    etaMin: 29,
    hours: "24 hours",
    open24: true,
    phone: "(423) 555-0455",
    services: ["tire", "air", "electrical", "engine", "def"],
    note: "Truck Care center, 4 bays, PM service and light mechanical.",
    rating: 4.3,
    reviews: 174,
  },
  {
    id: "sv-5",
    name: "TA Petro Service Center — Exit 407",
    kind: "bay",
    chain: "ta",
    milesAway: 27.3,
    etaMin: 34,
    hours: "24 hours",
    open24: true,
    phone: "(423) 555-0620",
    services: ["engine", "air", "def", "electrical", "tire", "no-start"],
    note: "Full heavy-duty shop, aftertreatment work, RoadSquad dispatch.",
    rating: 4.0,
    reviews: 641,
  },
  {
    id: "sv-6",
    name: "Whitaker Heavy Duty Repair",
    kind: "shop",
    milesAway: 18.1,
    etaMin: 26,
    hours: "07:00 – 18:00 Mon–Sat",
    open24: false,
    phone: "(423) 555-0777",
    services: ["engine", "def", "electrical", "air", "no-start"],
    note: "Independent heavy-duty shop. Cummins and Detroit certified.",
    rating: 4.9,
    reviews: 143,
  },
  {
    id: "sv-7",
    name: "Cumberland Heavy Recovery & Tow",
    kind: "tow",
    milesAway: 12.7,
    etaMin: 48,
    hours: "24 hours · 7 days",
    open24: true,
    phone: "(423) 555-0909",
    services: ["engine", "no-start", "tire", "air", "def", "electrical", "unknown"],
    note: "Heavy wrecker, loaded-trailer capable. Will tow to a shop you pick.",
    rating: 4.4,
    reviews: 258,
  },
  {
    id: "sv-8",
    name: "Valley Fleet Mobile Repair",
    kind: "mobile",
    milesAway: 16.5,
    etaMin: 55,
    hours: "05:00 – 23:00",
    open24: false,
    phone: "(423) 555-0264",
    services: ["electrical", "air", "no-start", "engine"],
    note: "Mobile tech, one-man van. Slower ETA at night.",
    rating: 4.2,
    reviews: 71,
  },
];

/** A GPS fix in the terms a driver actually relays over the phone. */
export type Fix = {
  highway: string;
  mileMarker: string;
  direction: string;
  nearestExit: string;
  county: string;
  state: string;
  lat: number;
  lng: number;
  shoulder: string;
  accuracyFt: number;
};

export const currentFix: Fix = {
  highway: "I-40",
  mileMarker: "MM 421",
  direction: "Eastbound",
  nearestExit: "Exit 424 — Strawberry Plains Pike, 3.1 mi ahead",
  county: "Knox County",
  state: "Tennessee",
  lat: 35.9812,
  lng: -83.7644,
  shoulder: "Right shoulder, roughly 11 feet — full truck width off the travel lane",
  accuracyFt: 18,
};

/** Safe-shoulder guidance, and whether this stretch is known bad. */
export const shoulderGuidance = {
  dangerous: true,
  why: "I-40 eastbound MM 418–423 is a known high-incident shoulder stretch — narrow, blind curve at 421, heavy night truck traffic.",
  steps: [
    "Hazard flashers on before anything else.",
    "Stay belted in the cab until you've checked your mirrors — traffic side is the danger side.",
    "Exit the passenger side. Never step out into the travel lane.",
    "Triangles: 10 feet behind on the traffic side, 100 feet behind, 100 feet ahead. On this curve put the far one at 200 feet so they see you coming around it.",
    "High-visibility vest on. Stay behind the guardrail while you wait.",
    "If you're hit-risk or the trailer is in a lane, call 911 first — not a shop.",
  ],
};

/** What the day looks like after a breakdown is logged — proposed, not applied. */
export const breakdownResetPlan = [
  {
    label: "Clock",
    detail:
      "Going off-duty at the breakdown protects 4h 06m of drive time. Your 14 is the pressure — you lose the delivery window if this runs past 2 hours.",
  },
  {
    label: "Load impact",
    detail:
      "Load L-2291 to Charlotte: current ETA slips from 18:40 to 22:15 with a 2-hour repair. Receiver closes at 20:00 — I'd propose calling for a next-morning appointment.",
  },
  {
    label: "Parking",
    detail:
      "Pilot #482 at Exit 424 has 31 of 78 spaces open, 14.9 miles ahead — reachable under tow or under your own power. Reserve before it fills after 20:00.",
  },
  {
    label: "Rest",
    detail:
      "If repair clears by 21:00, a 10-hour break starting there puts you rolling at 07:00 with a full 11. That's the cleanest version of this day.",
  },
  {
    label: "Money",
    detail:
      "Estimated repair $340–$900 depending on cause. Detention claim on the missed appointment is worth filing — I can prepare it for your signature.",
  },
];
