/**
 * DELIVERY & SUPPLY — mock data.
 *
 * Shaped the way real service APIs answer (per-service coverage check for a
 * lat/lng, catalog of storefronts, quoted ETA and fees) so Uber Eats, DoorDash,
 * Grubhub, Instacart, GoPuff, Walmart, Walgreens, CVS and Amazon can be wired in
 * behind `src/lib/delivery.tsx` without touching the UI.
 */

export type ServiceId =
  | "ubereats"
  | "doordash"
  | "grubhub"
  | "instacart"
  | "gopuff"
  | "walmart"
  | "walgreens"
  | "cvs"
  | "amazon";

export type ServiceCategory = "food" | "grocery" | "retail" | "pharmacy";

export type Service = {
  id: ServiceId;
  name: string;
  category: ServiceCategory;
  /** How the order actually reaches the driver. */
  fulfillment: "delivery" | "pickup" | "both";
  short: string;
  fill: string;
  text: string;
  note: string;
};

export const services: Service[] = [
  {
    id: "ubereats",
    name: "Uber Eats",
    category: "food",
    fulfillment: "delivery",
    short: "UE",
    fill: "#0a8a3c",
    text: "#ffffff",
    note: "Restaurant delivery to the truck",
  },
  {
    id: "doordash",
    name: "DoorDash",
    category: "food",
    fulfillment: "delivery",
    short: "DD",
    fill: "#e2371f",
    text: "#ffffff",
    note: "Restaurant delivery to the truck",
  },
  {
    id: "grubhub",
    name: "Grubhub",
    category: "food",
    fulfillment: "delivery",
    short: "GH",
    fill: "#e8642b",
    text: "#ffffff",
    note: "Restaurant delivery to the truck",
  },
  {
    id: "instacart",
    name: "Instacart",
    category: "grocery",
    fulfillment: "delivery",
    short: "IC",
    fill: "#f2a10a",
    text: "#151005",
    note: "Groceries shopped and delivered",
  },
  {
    id: "gopuff",
    name: "GoPuff",
    category: "grocery",
    fulfillment: "delivery",
    short: "GP",
    fill: "#5a2ce0",
    text: "#ffffff",
    note: "Essentials, drinks, snacks — fast window",
  },
  {
    id: "walmart",
    name: "Walmart",
    category: "retail",
    fulfillment: "both",
    short: "WM",
    fill: "#0a6ac8",
    text: "#ffffff",
    note: "Delivery, or pickup if a lot is truck-accessible",
  },
  {
    id: "walgreens",
    name: "Walgreens",
    category: "pharmacy",
    fulfillment: "pickup",
    short: "WG",
    fill: "#c8102e",
    text: "#ffffff",
    note: "Prescription and OTC pickup",
  },
  {
    id: "cvs",
    name: "CVS Pharmacy",
    category: "pharmacy",
    fulfillment: "pickup",
    short: "CVS",
    fill: "#d0202c",
    text: "#ffffff",
    note: "Prescription and OTC pickup",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "retail",
    fulfillment: "both",
    short: "AMZ",
    fill: "#e0851c",
    text: "#151005",
    note: "Parts, gear, locker or hold-for-pickup",
  },
];

export function serviceOf(id: ServiceId): Service {
  return services.find((s) => s.id === id) ?? services[0]!;
}

export const categoryLabels: Record<ServiceCategory, string> = {
  food: "Food delivery",
  grocery: "Groceries & essentials",
  retail: "Retail",
  pharmacy: "Pharmacy",
};

/* ------------------------------------------------------------- COVERAGE */

export type CoverageStatus = "available" | "limited" | "none";

export type Coverage = {
  service: ServiceId;
  status: CoverageStatus;
  /** Quoted delivery ETA in minutes when the service covers this spot. */
  etaMin?: number;
  minSpend?: number;
  deliveryFee?: number;
  /** Plain-language reason, read aloud when coverage is missing. */
  note: string;
};

export type DropLocation = {
  id: string;
  /** Where the driver is sitting, in words the driver would use. */
  label: string;
  kind: "dock" | "truckstop" | "rest" | "lot";
  detail: string;
  /** Miles ahead along the current route. 0 = where the truck is now. */
  milesAhead: number;
  coverage: Coverage[];
};

/** Where the truck is right now — an industrial lot with almost no coverage. */
export const currentLocation: DropLocation = {
  id: "loc-now",
  label: "Kroger DC · Dock 14",
  kind: "dock",
  detail: "1201 S Portland Ave, Oklahoma City OK · industrial park, gated lot",
  milesAhead: 0,
  coverage: [
    { service: "ubereats", status: "none", note: "No Uber Eats couriers cover this industrial park" },
    { service: "doordash", status: "none", note: "No DoorDash coverage at this address" },
    { service: "grubhub", status: "none", note: "No Grubhub coverage at this address" },
    {
      service: "instacart",
      status: "available",
      etaMin: 45,
      minSpend: 10,
      deliveryFee: 7.99,
      note: "Instacart shops the Homeland 4 miles out and drives in to the gate",
    },
    {
      service: "gopuff",
      status: "limited",
      etaMin: 70,
      minSpend: 15,
      deliveryFee: 4.95,
      note: "GoPuff reaches the gate but the window is long at this hour",
    },
    { service: "walmart", status: "none", note: "Walmart delivery does not run to this dock" },
    { service: "walgreens", status: "none", note: "Nearest Walgreens is pickup only, 6 miles out" },
    { service: "cvs", status: "none", note: "Nearest CVS is pickup only, 5 miles out" },
    {
      service: "amazon",
      status: "available",
      etaMin: 1440,
      note: "Amazon delivers to the guard shack next day — not tonight",
    },
  ],
};

/** Points ahead on the route with better coverage, used for the suggestion. */
export const coveragePoints: DropLocation[] = [
  {
    id: "loc-loves-412",
    label: "Love's #412",
    kind: "truckstop",
    detail: "I-35 Exit 137 · Purcell, OK",
    milesAhead: 34,
    coverage: [
      {
        service: "ubereats",
        status: "available",
        etaMin: 32,
        minSpend: 12,
        deliveryFee: 4.49,
        note: "Uber Eats delivers to the truck lot — meet note supported",
      },
      {
        service: "doordash",
        status: "available",
        etaMin: 28,
        minSpend: 10,
        deliveryFee: 3.99,
        note: "DoorDash delivers to the fuel island side of the lot",
      },
      { service: "grubhub", status: "limited", etaMin: 55, note: "Grubhub thin here — few drivers on" },
      {
        service: "instacart",
        status: "available",
        etaMin: 50,
        minSpend: 10,
        deliveryFee: 7.99,
        note: "Instacart covers Purcell",
      },
      { service: "gopuff", status: "none", note: "No GoPuff coverage in Purcell" },
      {
        service: "walmart",
        status: "available",
        etaMin: 90,
        deliveryFee: 9.95,
        note: "Walmart delivery covers this exit; pickup lot is not truck-friendly",
      },
      { service: "walgreens", status: "available", etaMin: 0, note: "Walgreens pickup 1.2 miles off the exit" },
      { service: "cvs", status: "none", note: "No CVS at this exit" },
      { service: "amazon", status: "available", etaMin: 1440, note: "Amazon locker inside the travel store" },
    ],
  },
  {
    id: "loc-pilot-330",
    label: "Pilot Travel Center #330",
    kind: "truckstop",
    detail: "I-35 Exit 108 · Pauls Valley, OK",
    milesAhead: 61,
    coverage: [
      {
        service: "ubereats",
        status: "available",
        etaMin: 38,
        minSpend: 12,
        deliveryFee: 4.99,
        note: "Uber Eats covers Pauls Valley",
      },
      { service: "doordash", status: "limited", etaMin: 60, note: "DoorDash slow after 10pm here" },
      { service: "grubhub", status: "none", note: "No Grubhub coverage in Pauls Valley" },
      { service: "instacart", status: "none", note: "No Instacart coverage in Pauls Valley" },
      { service: "gopuff", status: "none", note: "No GoPuff coverage in Pauls Valley" },
      { service: "walmart", status: "available", etaMin: 120, deliveryFee: 9.95, note: "Walmart delivers to the lot" },
      { service: "walgreens", status: "none", note: "No Walgreens at this exit" },
      { service: "cvs", status: "available", etaMin: 0, note: "CVS pickup 0.8 miles off the exit" },
      { service: "amazon", status: "available", etaMin: 1440, note: "Hold-for-pickup at the counter" },
    ],
  },
];

/* ------------------------------------------------------------- CATALOG */

export type OrderOption = {
  id: string;
  service: ServiceId;
  vendor: string;
  summary: string;
  items: string[];
  subtotal: number;
  deliveryFee: number;
  etaMin: number;
  note: string;
};

/** What HERCULES reads back when the driver speaks an order. */
export const orderOptions: OrderOption[] = [
  {
    id: "opt-1",
    service: "doordash",
    vendor: "Braum's · Purcell",
    summary: "Double burger, fries, sweet tea",
    items: ["Bacon double burger", "Large fries", "Large sweet tea"],
    subtotal: 17.45,
    deliveryFee: 3.99,
    etaMin: 28,
    note: "Fastest option in the lot right now",
  },
  {
    id: "opt-2",
    service: "ubereats",
    vendor: "Chili's · Purcell",
    summary: "Grilled chicken plate, side salad, unsweet tea",
    items: ["Grilled chicken plate", "Side salad", "Unsweet tea"],
    subtotal: 21.9,
    deliveryFee: 4.49,
    etaMin: 32,
    note: "Lighter plate — better for a night run",
  },
  {
    id: "opt-3",
    service: "instacart",
    vendor: "Homeland · Oklahoma City",
    summary: "Cooler restock — water, fruit, deli, coffee",
    items: [
      "Case of water",
      "Bananas and apples",
      "Turkey and cheese",
      "Ground coffee",
      "Electrolyte packets",
    ],
    subtotal: 38.6,
    deliveryFee: 7.99,
    etaMin: 45,
    note: "Delivers to the gate — guard will call you",
  },
  {
    id: "opt-4",
    service: "gopuff",
    vendor: "GoPuff · OKC",
    summary: "Drinks, snacks, ibuprofen, phone cable",
    items: ["Energy drinks x4", "Jerky", "Ibuprofen", "USB-C cable"],
    subtotal: 24.15,
    deliveryFee: 4.95,
    etaMin: 70,
    note: "Long window at this hour",
  },
];

export type Favorite = {
  id: string;
  label: string;
  service: ServiceId;
  vendor: string;
  items: string[];
  lastTotal: number;
  lastOrdered: string;
};

export const favorites: Favorite[] = [
  {
    id: "fav-1",
    label: "The usual burger run",
    service: "doordash",
    vendor: "Braum's",
    items: ["Bacon double burger", "Large fries", "Large sweet tea"],
    lastTotal: 23.62,
    lastOrdered: "Aug 29, 2026",
  },
  {
    id: "fav-2",
    label: "Cooler restock",
    service: "instacart",
    vendor: "Homeland",
    items: ["Case of water", "Fruit", "Deli meat", "Coffee"],
    lastTotal: 48.11,
    lastOrdered: "Aug 24, 2026",
  },
  {
    id: "fav-3",
    label: "Night shift coffee + snacks",
    service: "gopuff",
    vendor: "GoPuff",
    items: ["Cold brew x2", "Trail mix", "Jerky"],
    lastTotal: 19.4,
    lastOrdered: "Sep 1, 2026",
  },
];

/** Meet-here presets, because typing in a cab is the worst option. */
export const meetPresets = [
  "At the truck — driver side, I'll flash the marker lights",
  "Guard shack at the gate, ask for dock 14",
  "Fuel island, north side",
  "Back row of the truck lot, reefer running",
  "Front doors of the travel store",
];

export function coverageFor(loc: DropLocation, service: ServiceId): Coverage {
  return (
    loc.coverage.find((c) => c.service === service) ?? {
      service,
      status: "none",
      note: "No coverage information for this spot",
    }
  );
}

/** The plain line HERCULES says for one service at one spot. */
export function spokenCoverage(loc: DropLocation, service: ServiceId) {
  const svc = serviceOf(service);
  const c = coverageFor(loc, service);
  if (c.status === "none") return `No ${svc.name} available in this area.`;
  if (c.status === "limited")
    return `${svc.name} reaches you but it is thin — about ${c.etaMin} minutes.`;
  return `${svc.name} available — ${
    c.etaMin && c.etaMin >= 720 ? "next day" : `${c.etaMin} minute ETA`
  }.`;
}

/** Nearest point ahead that has real delivery coverage. */
export function nearestCovered(category: ServiceCategory = "food") {
  return coveragePoints.find((p) =>
    p.coverage.some(
      (c) => c.status === "available" && serviceOf(c.service).category === category,
    ),
  );
}
