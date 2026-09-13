/**
 * SUPPLY & PARTS — mock catalog.
 *
 * Shaped so a real dealer / supplier parts API (Freightliner, Rush, PACCAR,
 * Navistar, Volvo/Mack, FleetPride, TruckPro, NAPA HD) can be dropped in behind
 * `src/lib/parts.tsx` without touching a screen. Availability is expressed the
 * way a driver needs it: how far along MY route, and when can I have it.
 */

import type { FeeCategory } from "@/data/fees";

/* ------------------------------------------------------------------ SUPPLIERS */

export type SupplierKind = "dealer" | "aftermarket" | "service" | "stop" | "agency";

export type Supplier = {
  id: string;
  name: string;
  kind: SupplierKind;
  /** Two or three letters for the branded marker/badge. */
  badge: string;
  /** Brand tint used for the badge (theme-safe: gold/violet family or neutral). */
  tint: "primary" | "violet" | "neutral";
  note: string;
};

export const suppliers: Supplier[] = [
  {
    id: "freightliner",
    name: "Freightliner",
    kind: "dealer",
    badge: "FL",
    tint: "primary",
    note: "Detroit powertrain and Cascadia body parts, factory numbers",
  },
  {
    id: "rush",
    name: "Rush Truck Centers",
    kind: "dealer",
    badge: "RU",
    tint: "primary",
    note: "Largest network — usually has it on the shelf",
  },
  {
    id: "international",
    name: "Navistar / International",
    kind: "dealer",
    badge: "IN",
    tint: "primary",
    note: "International and MaxxForce, Fleetrite aftermarket line",
  },
  {
    id: "peterbilt",
    name: "Peterbilt",
    kind: "dealer",
    badge: "PB",
    tint: "violet",
    note: "PACCAR parts counter, PacLease service bays",
  },
  {
    id: "kenworth",
    name: "Kenworth",
    kind: "dealer",
    badge: "KW",
    tint: "violet",
    note: "PACCAR MX and Kenworth body parts",
  },
  {
    id: "volvo",
    name: "Volvo Trucks",
    kind: "dealer",
    badge: "VO",
    tint: "violet",
    note: "Volvo D13 and VNL specific components",
  },
  {
    id: "mack",
    name: "Mack Trucks",
    kind: "dealer",
    badge: "MK",
    tint: "violet",
    note: "Mack MP series and Anthem parts",
  },
  {
    id: "fleetpride",
    name: "FleetPride",
    kind: "aftermarket",
    badge: "FP",
    tint: "neutral",
    note: "Heavy-duty aftermarket, strong on air, brakes and drivetrain",
  },
  {
    id: "truckpro",
    name: "TruckPro",
    kind: "aftermarket",
    badge: "TP",
    tint: "neutral",
    note: "Aftermarket counter with same-day delivery in most metros",
  },
  {
    id: "napahd",
    name: "NAPA Heavy Duty",
    kind: "aftermarket",
    badge: "NA",
    tint: "neutral",
    note: "Everywhere, including small towns off the interstate",
  },
  {
    id: "amazon",
    name: "Amazon",
    kind: "aftermarket",
    badge: "AZ",
    tint: "neutral",
    note: "Cheapest on small consumables — slowest when you're broke down",
  },
  {
    id: "loves-tire",
    name: "Love's Truck Care",
    kind: "service",
    badge: "LV",
    tint: "primary",
    note: "Tire and light mechanical at the stop, 24 hours",
  },
  {
    id: "ta-petro",
    name: "TA / Petro RoadSquad",
    kind: "service",
    badge: "TA",
    tint: "primary",
    note: "Road service and full service bays",
  },
  {
    id: "pilot",
    name: "Pilot / Flying J",
    kind: "stop",
    badge: "PJ",
    tint: "primary",
    note: "Diesel, DEF, showers, parking, laundry",
  },
  {
    id: "permitco",
    name: "Permit & Tolling Desk",
    kind: "agency",
    badge: "PM",
    tint: "violet",
    note: "Trip permits, oversize, scale bypass and toll accounts",
  },
];

export function supplierById(id: string): Supplier {
  const found = suppliers.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown supplier: ${id}`);
  return found;
}

/* ----------------------------------------------------------------- CATEGORIES */

export type SupplyCategoryId =
  | "parts"
  | "tires"
  | "roadside"
  | "fuel"
  | "showerParking"
  | "laundry"
  | "securement"
  | "tools"
  | "permits";

export type SupplyCategory = {
  id: SupplyCategoryId;
  label: string;
  /** Which fee ladder this category bills on. */
  fee: FeeCategory;
  blurb: string;
  /** What the driver says out loud. */
  phrases: string[];
};

export const supplyCategories: SupplyCategory[] = [
  {
    id: "parts",
    label: "Truck Parts",
    fee: "parts",
    blurb: "Dealer and aftermarket parts, sourced against your fault codes and your route",
    phrases: [
      "part",
      "parts",
      "alternator",
      "turbo",
      "injector",
      "water pump",
      "air dryer",
      "sensor",
      "belt",
      "starter",
      "radiator",
      "fan clutch",
      "def pump",
      "doser",
      "egr",
      "filter",
    ],
  },
  {
    id: "tires",
    label: "Tires & Road Service",
    fee: "tires",
    blurb: "Casings, mounted road service, and tire trucks that come to the shoulder",
    phrases: ["tire", "tires", "casing", "retread", "blowout", "flat"],
  },
  {
    id: "roadside",
    label: "Roadside Service",
    fee: "roadside",
    blurb: "Mobile mechanic, tow, jump, air-up — booked and paid through HERCULES",
    phrases: ["roadside", "mobile mechanic", "tow", "wrecker", "jump start", "service call"],
  },
  {
    id: "fuel",
    label: "Fuel & DEF",
    fee: "fuel",
    blurb: "Discounted diesel and DEF authorized ahead of you on the route",
    phrases: ["fuel", "diesel", "def", "fill up", "top off"],
  },
  {
    id: "showerParking",
    label: "Showers & Parking",
    fee: "showerParking",
    blurb: "Held shower and reserved truck space at the stop you're aiming for",
    phrases: ["shower", "parking", "park", "space", "reserve"],
  },
  {
    id: "laundry",
    label: "Laundry",
    fee: "laundry",
    blurb: "Machine time held while you shower or sleep",
    phrases: ["laundry", "wash", "clothes", "washer", "dryer"],
  },
  {
    id: "securement",
    label: "Load Securement",
    fee: "securement",
    blurb: "Straps, chains, binders, tarps, corner protectors, load bars",
    phrases: [
      "strap",
      "straps",
      "chain",
      "chains",
      "tarp",
      "tarps",
      "binder",
      "binders",
      "load bar",
      "securement",
      "winch strap",
    ],
  },
  {
    id: "tools",
    label: "Tools & PPE",
    fee: "tools",
    blurb: "Hand tools, gloves, boots, vests, lights — the stuff you only miss at 2 a.m.",
    phrases: ["tool", "tools", "gloves", "vest", "boots", "flashlight", "ppe", "wrench", "socket"],
  },
  {
    id: "permits",
    label: "Permits, Scales & Tolling",
    fee: "permits",
    blurb: "Trip and oversize permits, scale bypass, toll accounts — filed for you",
    phrases: [
      "permit",
      "permits",
      "oversize",
      "toll",
      "tolling",
      "prepass",
      "bestpass",
      "scale bypass",
      "ifta",
    ],
  },
];

export function categoryById(id: SupplyCategoryId): SupplyCategory {
  const found = supplyCategories.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown supply category: ${id}`);
  return found;
}

/* ------------------------------------------------------------------- LISTINGS */

export type Listing = {
  id: string;
  supplierId: string;
  /** Branch or store the driver would actually reach. */
  location: string;
  /** Route miles ahead of the truck right now. */
  milesAhead: number;
  /** Detour off the mainline, in miles. */
  milesOffRoute: number;
  price: number;
  /** Units on the shelf; 0 = has to be ordered in. */
  inStock: number;
  /** When the driver can have it in hand. */
  ready: string;
  note: string;
  /** True where they'll bring it to the truck. */
  comesToYou?: boolean;
};

/* ----------------------------------------------------------------- PART MATCH */

export type PartMatch = {
  id: string;
  name: string;
  partNumber: string;
  category: SupplyCategoryId;
  /** Fault codes that point at this part. */
  faultCodes: string[];
  /** What the driver might say. */
  keywords: string[];
  /** Why HERCULES thinks this is the part — plain language, no jargon. */
  why: string;
  /** Confidence in the match, 0–100. */
  confidence: number;
  listings: Listing[];
};

export const partCatalog: PartMatch[] = [
  {
    id: "dpf-pressure-sensor",
    name: "Soot filter differential pressure sensor",
    partNumber: "DDE A004 153 2828",
    category: "parts",
    faultCodes: ["SPN 3251 / FMI 2", "SPN 3251"],
    keywords: [
      "soot",
      "dpf",
      "differential pressure",
      "pressure sensor",
      "aftertreatment",
      "regen",
      "3251",
    ],
    why: "Your erratic soot filter reading is almost always this sensor or its hose, not the filter itself. It's a cheap part and an hour of labour — replacing the filter is thousands.",
    confidence: 88,
    listings: [
      {
        id: "dpf-rush",
        supplierId: "rush",
        location: "Rush Truck Centers — Oklahoma City",
        milesAhead: 41,
        milesOffRoute: 1.2,
        price: 214.4,
        inStock: 3,
        ready: "On the shelf — ready when you pull in",
        note: "Right off I-35 exit 128, tractor parking at the counter",
      },
      {
        id: "dpf-fl",
        supplierId: "freightliner",
        location: "Freightliner of OKC",
        milesAhead: 46,
        milesOffRoute: 2.8,
        price: 248.0,
        inStock: 1,
        ready: "Last one — they'll hold it 4 hours",
        note: "Factory number, service bays open if you want it fitted",
      },
      {
        id: "dpf-fp",
        supplierId: "fleetpride",
        location: "FleetPride — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.6,
        price: 168.9,
        inStock: 2,
        ready: "20 minutes ahead of you, on the shelf",
        note: "Aftermarket equivalent, 1-year warranty",
      },
    ],
  },
  {
    id: "fan-clutch",
    name: "Engine fan clutch",
    partNumber: "HOR 79A9538",
    category: "parts",
    faultCodes: ["SPN 110 / FMI 16", "SPN 110"],
    keywords: ["fan clutch", "fan", "overheat", "coolant hot", "running hot", "110", "cooling"],
    why: "Coolant climbing only under load, with the rest of the cooling system reading normal, points at the fan clutch not locking up when it should.",
    confidence: 74,
    listings: [
      {
        id: "fan-rush",
        supplierId: "rush",
        location: "Rush Truck Centers — Oklahoma City",
        milesAhead: 41,
        milesOffRoute: 1.2,
        price: 612.75,
        inStock: 2,
        ready: "On the shelf — ready when you pull in",
        note: "Horton unit, they'll fit it same day if a bay is open",
      },
      {
        id: "fan-tp",
        supplierId: "truckpro",
        location: "TruckPro — Norman",
        milesAhead: 28,
        milesOffRoute: 3.4,
        price: 548.0,
        inStock: 1,
        ready: "Ready in about 40 minutes",
        note: "Reman unit with a 2-year warranty",
      },
      {
        id: "fan-az",
        supplierId: "amazon",
        location: "Delivered to your next stop",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 479.99,
        inStock: 9,
        ready: "Next day — no good if you're stopped now",
        note: "Cheapest, slowest. Fine if you're planning a PM, not a breakdown",
      },
    ],
  },
  {
    id: "air-dryer",
    name: "Air dryer cartridge",
    partNumber: "BW 109994",
    category: "parts",
    faultCodes: [],
    keywords: ["air dryer", "air leak", "purge", "wet tank", "moisture", "air"],
    why: "If the dryer is spitting or the tanks are wet, the cartridge is saturated. Cheap part, and it saves your valves.",
    confidence: 70,
    listings: [
      {
        id: "air-fp",
        supplierId: "fleetpride",
        location: "FleetPride — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.6,
        price: 96.5,
        inStock: 6,
        ready: "20 minutes ahead of you, on the shelf",
        note: "Bendix cartridge, everyone stocks this",
      },
      {
        id: "air-na",
        supplierId: "napahd",
        location: "NAPA Heavy Duty — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 1.1,
        price: 104.25,
        inStock: 2,
        ready: "10 minutes ahead, on the shelf",
        note: "Small-town counter, closes at 6",
      },
    ],
  },
  {
    id: "alternator",
    name: "Alternator, 160 amp",
    partNumber: "DEL 19011165",
    category: "parts",
    faultCodes: [],
    keywords: ["alternator", "charging", "voltage", "not charging", "battery light", "electrical"],
    why: "Voltage sagging at idle with good batteries is the alternator or the belt. Cheapest way to find out is to swap the alternator.",
    confidence: 66,
    listings: [
      {
        id: "alt-rush",
        supplierId: "rush",
        location: "Rush Truck Centers — Oklahoma City",
        milesAhead: 41,
        milesOffRoute: 1.2,
        price: 438.0,
        inStock: 4,
        ready: "On the shelf — ready when you pull in",
        note: "Delco reman with core charge included",
      },
      {
        id: "alt-in",
        supplierId: "international",
        location: "International — Oklahoma City",
        milesAhead: 44,
        milesOffRoute: 2.1,
        price: 466.9,
        inStock: 2,
        ready: "On the shelf",
        note: "Fleetrite line, 18-month warranty",
      },
    ],
  },
  {
    id: "starter",
    name: "Starter motor",
    partNumber: "DEL 8200308",
    category: "parts",
    faultCodes: [],
    keywords: ["starter", "won't start", "wont start", "no crank", "click", "cranking"],
    why: "One loud click and nothing turning is a starter or its solenoid nine times out of ten.",
    confidence: 71,
    listings: [
      {
        id: "start-tp",
        supplierId: "truckpro",
        location: "TruckPro — Norman",
        milesAhead: 28,
        milesOffRoute: 3.4,
        price: 392.0,
        inStock: 3,
        ready: "Ready in about 40 minutes",
        note: "Reman, and they run parts out to the shoulder in this area",
        comesToYou: true,
      },
      {
        id: "start-pb",
        supplierId: "peterbilt",
        location: "Peterbilt — Oklahoma City",
        milesAhead: 43,
        milesOffRoute: 1.9,
        price: 471.5,
        inStock: 1,
        ready: "On the shelf",
        note: "PACCAR counter, service bay available",
      },
    ],
  },
  {
    id: "def-pump",
    name: "DEF supply pump / doser module",
    partNumber: "DDE A000 490 5578",
    category: "parts",
    faultCodes: ["SPN 4334", "SPN 3363"],
    keywords: ["def pump", "def", "doser", "urea", "derate", "emissions", "aftertreatment pump"],
    why: "A DEF derate with good fluid in the tank is usually the pump or the doser, and the clock on a derate is short — 5 mph territory if you leave it.",
    confidence: 79,
    listings: [
      {
        id: "def-fl",
        supplierId: "freightliner",
        location: "Freightliner of OKC",
        milesAhead: 46,
        milesOffRoute: 2.8,
        price: 1284.0,
        inStock: 1,
        ready: "On the shelf — they'll hold it",
        note: "Factory part, this is the one that clears the derate",
      },
      {
        id: "def-vo",
        supplierId: "volvo",
        location: "Volvo Trucks — Oklahoma City",
        milesAhead: 47,
        milesOffRoute: 3.2,
        price: 1349.0,
        inStock: 2,
        ready: "On the shelf",
        note: "Volvo/Mack applications",
      },
    ],
  },
  {
    id: "brake-shoe-kit",
    name: "Drive axle brake shoe & hardware kit",
    partNumber: "MER XK2124710QP",
    category: "parts",
    faultCodes: [],
    keywords: ["brake", "brakes", "shoes", "lining", "drum", "brake wear"],
    why: "Full axle set with hardware — doing one side only gets you written up at a scale.",
    confidence: 68,
    listings: [
      {
        id: "brake-fp",
        supplierId: "fleetpride",
        location: "FleetPride — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.6,
        price: 312.4,
        inStock: 4,
        ready: "20 minutes ahead of you, on the shelf",
        note: "Meritor kit, axle set",
      },
      {
        id: "brake-kw",
        supplierId: "kenworth",
        location: "Kenworth — Oklahoma City",
        milesAhead: 42,
        milesOffRoute: 2.4,
        price: 366.0,
        inStock: 2,
        ready: "On the shelf",
        note: "Counter plus bay if you want it done there",
      },
    ],
  },
];

/* ------------------------------------------------- NON-PARTS SUPPLY ITEMS */

export type SupplyItem = {
  id: string;
  category: SupplyCategoryId;
  name: string;
  detail: string;
  listings: Listing[];
};

export const supplyItems: SupplyItem[] = [
  {
    id: "drive-tire",
    category: "tires",
    name: "Drive tire, 295/75R22.5 — mounted",
    detail: "Casing, mount, balance and disposal. Road service comes to the shoulder.",
    listings: [
      {
        id: "tire-loves",
        supplierId: "loves-tire",
        location: "Love's Truck Care #412 — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.4,
        price: 486.0,
        inStock: 5,
        ready: "Bay open now, about 45 minutes of work",
        note: "24 hours, tire truck available if you can't move",
        comesToYou: true,
      },
      {
        id: "tire-ta",
        supplierId: "ta-petro",
        location: "TA RoadSquad — Norman",
        milesAhead: 27,
        milesOffRoute: 1.0,
        price: 512.0,
        inStock: 3,
        ready: "Truck to you in about 70 minutes",
        note: "Road service call plus the casing",
        comesToYou: true,
      },
    ],
  },
  {
    id: "mobile-service-call",
    category: "roadside",
    name: "Mobile mechanic service call",
    detail: "One hour on site plus the call-out. Diagnosis and light repair at the truck.",
    listings: [
      {
        id: "road-ta",
        supplierId: "ta-petro",
        location: "TA RoadSquad — dispatched to your mile marker",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 345.0,
        inStock: 1,
        ready: "About 55 minutes to reach you",
        note: "Heavy-duty diesel tech, air and electrical capable",
        comesToYou: true,
      },
      {
        id: "road-loves",
        supplierId: "loves-tire",
        location: "Love's Truck Care — dispatched to you",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 298.0,
        inStock: 1,
        ready: "About 80 minutes to reach you",
        note: "Cheaper call-out, longer wait",
        comesToYou: true,
      },
    ],
  },
  {
    id: "diesel-fill",
    category: "fuel",
    name: "Diesel — 150 gallons authorized",
    detail: "Discounted rate held on the pump before you pull in. DEF included if you want it.",
    listings: [
      {
        id: "fuel-pilot",
        supplierId: "pilot",
        location: "Pilot #330 — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 0.3,
        price: 561.0,
        inStock: 1,
        ready: "Authorized before you pull onto the island",
        note: "$3.74/gal held — 11 cents under the posted cash price",
      },
    ],
  },
  {
    id: "def-jug",
    category: "fuel",
    name: "DEF — 2.5 gallon jugs, case of 2",
    detail: "Enough to get you through to your next fuel stop without a derate.",
    listings: [
      {
        id: "def-pilot",
        supplierId: "pilot",
        location: "Pilot #330 — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 0.3,
        price: 38.5,
        inStock: 12,
        ready: "Held at the counter under your name",
        note: "Cheaper on the bulk pump if you'd rather",
      },
    ],
  },
  {
    id: "shower-reserve",
    category: "showerParking",
    name: "Shower — held for tonight",
    detail: "Held under your name, no queue when you walk in.",
    listings: [
      {
        id: "shower-loves",
        supplierId: "loves-tire",
        location: "Love's #412 — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.4,
        price: 15.0,
        inStock: 4,
        ready: "Held for 3 hours from arrival",
        note: "Loyalty credit applied if your account is linked",
      },
    ],
  },
  {
    id: "parking-reserve",
    category: "showerParking",
    name: "Reserved truck space — overnight",
    detail: "A named space, so you're not circling a full lot at midnight.",
    listings: [
      {
        id: "park-pilot",
        supplierId: "pilot",
        location: "Pilot #330 — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 0.3,
        price: 18.0,
        inStock: 6,
        ready: "Held from 18:00 tonight",
        note: "Lit end of the lot, away from the reefer row",
      },
    ],
  },
  {
    id: "laundry-slot",
    category: "laundry",
    name: "Laundry — washer and dryer time",
    detail: "Machine time held while you shower.",
    listings: [
      {
        id: "laundry-ta",
        supplierId: "ta-petro",
        location: "TA — Norman",
        milesAhead: 27,
        milesOffRoute: 1.0,
        price: 12.0,
        inStock: 2,
        ready: "Held for a 2-hour window",
        note: "Detergent at the counter",
      },
    ],
  },
  {
    id: "strap-set",
    category: "securement",
    name: "4-inch winch straps — set of 4",
    detail: "5,400 lb working load, flat hooks. Enough to replace a frayed set.",
    listings: [
      {
        id: "strap-fp",
        supplierId: "fleetpride",
        location: "FleetPride — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.6,
        price: 148.0,
        inStock: 20,
        ready: "On the shelf",
        note: "DOT-legal tags on every strap",
      },
      {
        id: "strap-az",
        supplierId: "amazon",
        location: "Delivered to your next stop",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 119.99,
        inStock: 40,
        ready: "Next day",
        note: "Fine to plan ahead with, no use tonight",
      },
    ],
  },
  {
    id: "chain-binder",
    category: "securement",
    name: "3/8 transport chain + ratchet binders, pair",
    detail: "Grade 70, tagged. For flatbed and heavy haul work.",
    listings: [
      {
        id: "chain-tp",
        supplierId: "truckpro",
        location: "TruckPro — Norman",
        milesAhead: 28,
        milesOffRoute: 3.4,
        price: 262.0,
        inStock: 8,
        ready: "Ready in about 40 minutes",
        note: "Tags included — a scale will ask",
      },
    ],
  },
  {
    id: "tarp-set",
    category: "securement",
    name: "Steel tarp, 16x24 — 8 foot drop",
    detail: "Heavy vinyl with reinforced corners.",
    listings: [
      {
        id: "tarp-fp",
        supplierId: "fleetpride",
        location: "FleetPride — Purcell",
        milesAhead: 18,
        milesOffRoute: 0.6,
        price: 389.0,
        inStock: 2,
        ready: "On the shelf",
        note: "They'll load it in the side box for you",
      },
    ],
  },
  {
    id: "glove-light",
    category: "tools",
    name: "Mechanic's gloves + rechargeable work light",
    detail: "The two things you always want at 2 a.m. on the shoulder.",
    listings: [
      {
        id: "tools-na",
        supplierId: "napahd",
        location: "NAPA Heavy Duty — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 1.1,
        price: 54.9,
        inStock: 15,
        ready: "10 minutes ahead, on the shelf",
        note: "Closes at 6 — say the word and I'll hold it",
      },
    ],
  },
  {
    id: "hi-vis",
    category: "tools",
    name: "Class 2 hi-vis vest + triangles",
    detail: "Replaces what you left at the last shipper.",
    listings: [
      {
        id: "vest-pilot",
        supplierId: "pilot",
        location: "Pilot #330 — Pauls Valley",
        milesAhead: 9,
        milesOffRoute: 0.3,
        price: 42.0,
        inStock: 9,
        ready: "Held at the counter",
        note: "DOT-compliant triangle set",
      },
    ],
  },
  {
    id: "trip-permit",
    category: "permits",
    name: "Oklahoma trip permit — 72 hour",
    detail: "Filed and emailed to you, ready to show at a scale.",
    listings: [
      {
        id: "permit-ok",
        supplierId: "permitco",
        location: "Filed electronically",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 78.0,
        inStock: 1,
        ready: "In your hand in about 20 minutes",
        note: "State fee included, no counter visit",
      },
    ],
  },
  {
    id: "oversize-permit",
    category: "permits",
    name: "Oversize permit — single trip, 12 ft wide",
    detail: "Route-specific, with the approved routing attached.",
    listings: [
      {
        id: "permit-os",
        supplierId: "permitco",
        location: "Filed electronically",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 265.0,
        inStock: 1,
        ready: "Usually 2 hours, longer if the state is slow",
        note: "HERCULES loads the approved route into your navigation",
      },
    ],
  },
  {
    id: "toll-account",
    category: "permits",
    name: "Toll & scale bypass account — top-up",
    detail: "Prepaid balance for tolling and weigh station bypass.",
    listings: [
      {
        id: "toll-top",
        supplierId: "permitco",
        location: "Applied to your account",
        milesAhead: 0,
        milesOffRoute: 0,
        price: 200.0,
        inStock: 1,
        ready: "Live within a few minutes",
        note: "Bypass works at the next scale on I-35",
      },
    ],
  },
];

/* -------------------------------------------------------------- MATCH HELPERS */

/** Best part matches for something the driver said or a code they read out. */
export function matchParts(text: string): PartMatch[] {
  const t = text.toLowerCase();
  const scored = partCatalog
    .map((p) => {
      let score = 0;
      for (const code of p.faultCodes) if (t.includes(code.toLowerCase())) score += 60;
      for (const k of p.keywords) if (t.includes(k)) score += 12;
      if (t.includes(p.name.toLowerCase())) score += 30;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.p);
}

/** The part a live fault code points at. */
export function partForFault(code: string): PartMatch | undefined {
  const c = code.toLowerCase();
  return partCatalog.find((p) =>
    p.faultCodes.some((f) => c.includes(f.toLowerCase()) || f.toLowerCase().includes(c)),
  );
}

/** Which supply category the driver is talking about, if any. */
export function categoryFromSpeech(text: string): SupplyCategoryId | null {
  const t = text.toLowerCase();
  for (const c of supplyCategories) {
    if (c.phrases.some((p) => t.includes(p))) return c.id;
  }
  return null;
}

export function itemsIn(category: SupplyCategoryId): SupplyItem[] {
  return supplyItems.filter((i) => i.category === category);
}

/** Cheapest listing the driver can actually reach in time. */
export function bestListing(listings: Listing[]): Listing | undefined {
  return [...listings].sort((a, b) => {
    const aBad = a.inStock === 0 ? 1 : 0;
    const bBad = b.inStock === 0 ? 1 : 0;
    if (aBad !== bBad) return aBad - bBad;
    return a.price - b.price;
  })[0];
}

/** How HERCULES reads a listing out loud. */
export function spokenListing(name: string, l: Listing): string {
  const s = supplierById(l.supplierId);
  const where = l.comesToYou
    ? "and they come out to the truck"
    : l.milesAhead === 0
      ? "delivered to your stop"
      : `${l.milesAhead} miles ahead, ${l.milesOffRoute.toFixed(1)} off the mainline`;
  return `${name} at ${s.name}, ${l.price.toFixed(2)} dollars, ${where}. ${l.ready}.`;
}
