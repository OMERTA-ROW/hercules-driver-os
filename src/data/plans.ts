export type PlanId = "company" | "owner" | "fleet";

export type Feature =
  | "dashboard"
  | "health"
  | "alerts"
  | "driver"
  | "voice"
  | "loads"
  | "financials"
  | "loadReset"
  | "fleet";

export const featureLabels: Record<Feature, string> = {
  dashboard: "Dashboard",
  health: "Truck health (ECM + sensors)",
  alerts: "Driver alerts network",
  driver: "Driver profile & fatigue learning",
  voice: "Voice interface",
  loads: "Load board + facility intelligence + Approve & Book",
  financials: "Financials, settlements, fuel & IFTA",
  loadReset: "Load Reset (rebuild the whole day)",
  fleet: "Fleet overview, multi-truck, consolidated reporting",
};

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  unit: string;
  minSeats?: number;
  who: string;
  features: Feature[];
  excluded: string[];
};

export const plans: Plan[] = [
  {
    id: "company",
    name: "Company Driver",
    price: 5,
    unit: "/month",
    who: "You drive someone else's truck and someone else's freight.",
    features: ["dashboard", "health", "alerts", "driver", "voice"],
    excluded: ["No load board or booking", "No financials or settlements", "No Load Reset"],
  },
  {
    id: "owner",
    name: "Owner-Operator",
    price: 29,
    unit: "/month",
    who: "You book your own freight and you carry your own cost.",
    features: [
      "dashboard",
      "health",
      "alerts",
      "driver",
      "voice",
      "loads",
      "financials",
      "loadReset",
    ],
    excluded: ["No fleet overview or multi-truck management"],
  },
  {
    id: "fleet",
    name: "Fleet / Carrier",
    price: 19,
    unit: "per truck / month",
    minSeats: 3,
    who: "You run trucks and drivers, not just your own seat.",
    features: [
      "dashboard",
      "health",
      "alerts",
      "driver",
      "voice",
      "loads",
      "financials",
      "loadReset",
      "fleet",
    ],
    excluded: [],
  },
];

export function planById(id: PlanId): Plan {
  return plans.find((p) => p.id === id) ?? plans[1]!;
}

export function planHas(id: PlanId, feature: Feature) {
  return planById(id).features.includes(feature);
}

export const TRIAL_DAYS = 7;
