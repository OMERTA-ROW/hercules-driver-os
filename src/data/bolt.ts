/**
 * THE BOLT — HERCULES-branded ECU adapters.
 *
 * Two families, one seam:
 *   j1939 — nine-pin Deutsch, Class 7 and 8 heavy trucks.
 *   obd2  — sixteen-pin OBD-II: cars, cargo vans, Sprinters, van haulers,
 *           hotshot Class 3 through 5 pickups, light and medium duty.
 *
 * Every adapter declares WHAT IT CAN REPORT. Screens read that capability list
 * and hide anything the connected vehicle physically cannot send — never an
 * empty value. The frame shapes mirror a real stream (SPN/FMI for J1939,
 * standard P-codes and PIDs for OBD-II), so a live Bluetooth implementation can
 * be dropped in behind `src/lib/bolt.tsx` without touching a screen.
 */

import type { VehicleSpec } from "./vehicles";

export type AdapterKind = "j1939" | "obd2";

export type FaultFrame = {
  code: string;
  /** J1939 only. */
  spn?: number;
  fmi?: number;
  system: string;
  severity: "watch" | "alert";
  /** Plain-English translation the driver actually hears. */
  plain: string;
  firstSeen: string;
  occurrences: number;
};

export type LiveValue = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  status: "ok" | "watch" | "alert";
  detail: string;
  pct?: number;
  /** Spoken form, plain language — never a raw code number. */
  spoken: string;
};

export type TireFrame = { pos: string; psi: number; target: number; status: "ok" | "watch" | "alert" };

export type Prediction = {
  title: string;
  window: string;
  confidence: number;
  text: string;
  spoken: string;
};

/** OBD-II emissions readiness monitors — required for inspection states. */
export type ReadinessMonitor = {
  name: string;
  state: "ready" | "not-ready" | "not-supported";
  detail: string;
};

/* ------------------------------------------------------------ J1939 (heavy) */

export const boltFaults: FaultFrame[] = [
  {
    code: "SPN 3251 / FMI 2",
    spn: 3251,
    fmi: 2,
    system: "Aftertreatment",
    severity: "watch",
    plain:
      "Your soot filter pressure sensor is reading erratic. The truck is not derating. Watch it through the next burn-off.",
    firstSeen: "2 days ago",
    occurrences: 3,
  },
  {
    code: "SPN 110 / FMI 16",
    spn: 110,
    fmi: 16,
    system: "Cooling",
    severity: "alert",
    plain:
      "Your coolant is running hotter than it should under load. Ease off on long climbs and get the fan clutch and radiator looked at.",
    firstSeen: "Today 13:22",
    occurrences: 1,
  },
];

/** Baseline stream values. The mock provider jitters the live ones. */
export const boltBaseline: LiveValue[] = [
  {
    key: "mpg",
    label: "Fuel economy",
    value: "7.4",
    unit: "MPG",
    status: "ok",
    detail: "Trip average 7.1 · rolling 30-day 6.9",
    pct: 74,
    spoken: "You're running seven and a half miles a gallon right now, a touch better than your month.",
  },
  {
    key: "rpm",
    label: "Engine RPM",
    value: "1,412",
    unit: "rpm",
    status: "ok",
    detail: "Cruise band 1,350–1,450",
    pct: 58,
    spoken: "Engine's sitting right in the cruise band.",
  },
  {
    key: "hours",
    label: "Engine hours",
    value: "14,208",
    unit: "hrs",
    status: "ok",
    detail: "Next service interval at 14,500 hrs",
    pct: 62,
    spoken: "Fourteen thousand two hundred hours on the engine, service due in about three hundred.",
  },
  {
    key: "odo",
    label: "Odometer",
    value: "612,447",
    unit: "mi",
    status: "ok",
    detail: "Since last PM: 11,320 mi",
    spoken: "Six hundred twelve thousand miles, eleven thousand since your last service.",
  },
  {
    key: "coolant",
    label: "Coolant temp",
    value: "214",
    unit: "°F",
    status: "watch",
    detail: "Running 9°F above your 30-day norm on grades",
    pct: 82,
    spoken: "Coolant is nine degrees warmer than normal on the climbs. Worth watching.",
  },
  {
    key: "oil",
    label: "Oil temp",
    value: "228",
    unit: "°F",
    status: "ok",
    detail: "Within normal band (205–240°F)",
    pct: 66,
    spoken: "Oil temperature is normal.",
  },
  {
    key: "def",
    label: "DEF level",
    value: "38",
    unit: "%",
    status: "watch",
    detail: "About 1,050 mi remaining — top off in OKC",
    pct: 38,
    spoken: "DEF is at thirty-eight percent, roughly a thousand miles. Top it off in Oklahoma City.",
  },
  {
    key: "aftertreatment",
    label: "Soot load",
    value: "62",
    unit: "%",
    status: "watch",
    detail: "Burn-off likely in ~600 mi · best on the interstate",
    pct: 62,
    spoken: "Your filter is about two thirds loaded. It will want a burn-off in six hundred miles.",
  },
  {
    key: "volts",
    label: "Battery voltage",
    value: "13.9",
    unit: "V",
    status: "ok",
    detail: "Charging normally · 12.6V at rest",
    pct: 78,
    spoken: "Charging system looks healthy.",
  },
  {
    key: "idle",
    label: "Idle time (today)",
    value: "2h 41m",
    status: "watch",
    detail: "Costing roughly $11.40 in fuel today",
    pct: 44,
    spoken: "You've idled two hours forty minutes today, about eleven dollars in fuel.",
  },
  {
    key: "brakes",
    label: "Brake wear (steer)",
    value: "58",
    unit: "%",
    status: "ok",
    detail: "Est. 42,000 mi remaining",
    pct: 58,
    spoken: "Steer brakes are a bit over half life.",
  },
];

export const boltTires: TireFrame[] = [
  { pos: "Steer LF", psi: 108, target: 110, status: "ok" },
  { pos: "Steer RF", psi: 105, target: 110, status: "watch" },
  { pos: "Drive LFO", psi: 98, target: 100, status: "ok" },
  { pos: "Drive LFI", psi: 99, target: 100, status: "ok" },
  { pos: "Drive RFI", psi: 88, target: 100, status: "alert" },
  { pos: "Drive RFO", psi: 97, target: 100, status: "ok" },
  { pos: "Trailer LR", psi: 101, target: 100, status: "ok" },
  { pos: "Trailer RR", psi: 96, target: 100, status: "watch" },
];

export const boltPredictions: Prediction[] = [
  {
    title: "Right drive inner tire losing 3 psi/day",
    window: "Address within 2 days",
    confidence: 91,
    text: "Pattern matches a slow valve stem leak. Suggested: check at your OKC delivery, 4 mi from a tire shop that takes walk-ins.",
    spoken:
      "Your right inner drive tire is bleeding about three pounds a day — that reads like a valve stem. I'd get it looked at within two days.",
  },
  {
    title: "Soot filter burn-off likely in ~600 mi",
    window: "Plan a highway stretch",
    confidence: 78,
    text: "Suggested: let it complete on I-40 rather than in a city stop-and-go run.",
    spoken:
      "Your filter will want to burn off in about six hundred miles. Better on the interstate than in town.",
  },
  {
    title: "Coolant system trending warm",
    window: "Inspect within 1,500 mi",
    confidence: 64,
    text: "Suggested: fan clutch and radiator wash at your next PM. No derate risk today.",
    spoken:
      "Cooling system is trending warm over the last month. Fan clutch and a radiator wash at your next service.",
  },
];

/**
 * Things HERCULES raises on its own from the stream — no driver polling.
 * `atSecond` is how far into the session the mock monitor surfaces each one.
 */
export const boltAutoAlerts = [
  {
    id: "coolant-climb",
    severity: "alert" as const,
    atSecond: 6,
    spoken:
      "Heads up — your coolant just climbed above its normal band under load. Nothing is derating, but ease off the throttle on this grade.",
  },
  {
    id: "tire-drop",
    severity: "watch" as const,
    atSecond: 20,
    spoken:
      "Your right inner drive tire is down twelve pounds from target. That's the slow leak I've been tracking.",
  },
  {
    id: "def-low",
    severity: "watch" as const,
    atSecond: 40,
    spoken:
      "DEF is under forty percent — about a thousand miles left. There's a stop in Oklahoma City on your route.",
  },
];

export const boltPairingSteps = [
  {
    title: "Find the nine-pin port",
    body: "Under the dash on the driver's side, round black connector with nine pins. Key on, engine off is fine.",
  },
  {
    title: "Plug in THE BOLT",
    body: "Push straight in and turn the collar until it seats. The thunderbolt lights amber, then gold.",
  },
  {
    title: "Pair over Bluetooth",
    body: "HERCULES finds THE BOLT within about ten seconds. No PIN, no phone settings.",
  },
  {
    title: "Confirm the stream",
    body: "You'll see live RPM and coolant come alive. That's your ECU talking to HERCULES.",
  },
] as const;

/* --------------------------------------------------------- OBD-II (lighter) */

export const obdFaults: FaultFrame[] = [
  {
    code: "P0171",
    system: "Fuel system",
    severity: "watch",
    plain:
      "Your engine is running lean on bank one. Usually a vacuum leak or a tired mass-airflow sensor. It will still drive, but your fuel mileage is paying for it.",
    firstSeen: "3 days ago",
    occurrences: 6,
  },
  {
    code: "P0300",
    system: "Ignition",
    severity: "alert",
    plain:
      "Random misfire across cylinders. Feels like a stumble under load. Get the plugs and coils looked at before it fouls the catalytic converter.",
    firstSeen: "Today 11:04",
    occurrences: 2,
  },
];

export const obdBaseline: LiveValue[] = [
  {
    key: "mpg",
    label: "Fuel economy",
    value: "18.6",
    unit: "MPG",
    status: "ok",
    detail: "Trip average 18.1 · rolling 30-day 19.4",
    pct: 62,
    spoken: "You're getting about eighteen and a half miles a gallon, a little under your month.",
  },
  {
    key: "rpm",
    label: "Engine RPM",
    value: "2,140",
    unit: "rpm",
    status: "ok",
    detail: "Cruise band 1,900–2,300",
    pct: 54,
    spoken: "Engine speed is right where it should be at cruise.",
  },
  {
    key: "odo",
    label: "Odometer",
    value: "184,902",
    unit: "mi",
    status: "ok",
    detail: "Since last oil change: 4,780 mi",
    spoken: "A hundred eighty-four thousand miles, forty-eight hundred since your oil change.",
  },
  {
    key: "coolant",
    label: "Coolant temp",
    value: "207",
    unit: "°F",
    status: "ok",
    detail: "Within normal band (195–215°F)",
    pct: 64,
    spoken: "Coolant temperature is normal.",
  },
  {
    key: "oil",
    label: "Oil temp",
    value: "219",
    unit: "°F",
    status: "watch",
    detail: "Running 8°F warm on long climbs",
    pct: 74,
    spoken: "Oil is running a touch warm on the climbs. Nothing urgent.",
  },
  {
    key: "trimShort",
    label: "Fuel trim (short)",
    value: "+8.6",
    unit: "%",
    status: "watch",
    detail: "Bank 1 adding fuel to correct a lean reading",
    pct: 58,
    spoken: "The engine is adding fuel to correct a lean reading on bank one.",
  },
  {
    key: "trimLong",
    label: "Fuel trim (long)",
    value: "+11.2",
    unit: "%",
    status: "watch",
    detail: "Drifted up over 30 days — points at a vacuum leak",
    pct: 66,
    spoken: "Your long-term fuel trim has drifted up over the month. That reads like a vacuum leak.",
  },
  {
    key: "volts",
    label: "Battery voltage",
    value: "14.1",
    unit: "V",
    status: "ok",
    detail: "Charging normally · 12.5V at rest",
    pct: 80,
    spoken: "Charging system is healthy.",
  },
  {
    key: "intake",
    label: "Intake air temp",
    value: "96",
    unit: "°F",
    status: "ok",
    detail: "Ambient 84°F · normal underhood rise",
    pct: 48,
    spoken: "Intake air temperature is normal for the weather.",
  },
];

export const obdReadiness: ReadinessMonitor[] = [
  { name: "Misfire", state: "not-ready", detail: "Incomplete since the last code clear" },
  { name: "Fuel system", state: "not-ready", detail: "Needs a steady highway drive cycle" },
  { name: "Catalyst", state: "ready", detail: "Monitor complete" },
  { name: "Oxygen sensor", state: "ready", detail: "Monitor complete" },
  { name: "EVAP system", state: "ready", detail: "Monitor complete" },
  { name: "EGR system", state: "ready", detail: "Monitor complete" },
  { name: "Secondary air", state: "not-supported", detail: "Not fitted to this vehicle" },
];

export const obdPredictions: Prediction[] = [
  {
    title: "Lean condition trending worse",
    window: "Inspect within 500 mi",
    confidence: 84,
    text: "Long-term trim has climbed 4 points in three weeks. Suggested: smoke-test the intake and check the MAF sensor.",
    spoken:
      "Your lean condition is getting worse, not better. I'd have the intake smoke-tested inside five hundred miles.",
  },
  {
    title: "Misfire will foul the converter",
    window: "Address this week",
    confidence: 76,
    text: "Random misfire under load. Suggested: plugs and coil packs before it turns into a converter bill.",
    spoken:
      "That misfire will cook your catalytic converter if it runs. Plugs and coils this week saves you the bigger bill.",
  },
  {
    title: "Emissions test would fail today",
    window: "Two monitors incomplete",
    confidence: 92,
    text: "Misfire and fuel-system monitors are not ready. Suggested: clear the fault first, then a highway drive cycle.",
    spoken:
      "You would fail an emissions test today — two monitors are incomplete. Fix the code first, then a good highway run.",
  },
];

export const obdAutoAlerts = [
  {
    id: "obd-misfire",
    severity: "alert" as const,
    atSecond: 6,
    spoken:
      "Heads up — I just caught a misfire under load. It's not shutting you down, but it will hurt the converter if you leave it.",
  },
  {
    id: "obd-trim",
    severity: "watch" as const,
    atSecond: 22,
    spoken:
      "Your long-term fuel trim is up over eleven percent. That's a vacuum leak costing you fuel every mile.",
  },
  {
    id: "obd-readiness",
    severity: "watch" as const,
    atSecond: 40,
    spoken:
      "Two emissions monitors are not ready. If you have an inspection coming, you'd fail it today.",
  },
];

export const obdPairingSteps = [
  {
    title: "Find the sixteen-pin OBD-II port",
    body: "Under the dash on the driver's side, trapezoid connector with sixteen pins. Key on, engine off is fine.",
  },
  {
    title: "Plug in THE BOLT LT",
    body: "Push straight in until it clicks. The thunderbolt lights amber, then gold.",
  },
  {
    title: "Pair over Bluetooth",
    body: "HERCULES finds it in about ten seconds. No PIN, no phone settings.",
  },
  {
    title: "Confirm the stream",
    body: "Live RPM and coolant come alive. That's your ECU talking to HERCULES.",
  },
] as const;

/* ---------------------------------------------------------------- PRODUCTS */

export type AdapterProduct = {
  kind: AdapterKind;
  name: string;
  tagline: string;
  /** Placeholder price — edit this single value to change it everywhere. */
  price: number;
  priceLabel: string;
  sku: string;
  /** Which one-time purchase in `usePurchases` unlocks it. */
  purchaseId: "bolt" | "boltObd";
  portName: string;
  summary: string;
  unlocks: string[];
  compatibility: string;
  fits: string;
  inBox: string[];
  pairingSteps: readonly { title: string; body: string }[];
  /** Live-value keys this bus can actually report. Anything else is hidden. */
  reports: string[];
  /** Tire pressure telemetry (commercial TPMS on the J1939 bus only). */
  hasTires: boolean;
  /** Emissions readiness monitors (OBD-II inspection data). */
  hasReadiness: boolean;
  faultLabel: string;
};

export const adapters: Record<AdapterKind, AdapterProduct> = {
  j1939: {
    kind: "j1939",
    name: "THE BOLT",
    tagline: "HERCULES J1939 nine-pin ECU reader",
    price: 149.0,
    priceLabel: "$149.00",
    sku: "HERC-BOLT-9PIN",
    purchaseId: "bolt",
    portName: "nine-pin Deutsch port",
    summary:
      "Plugs into your truck's nine-pin diagnostic port and streams live engine data to HERCULES over Bluetooth. One-time purchase — not part of your subscription, no monthly fee.",
    unlocks: [
      "Full commercial fault code set translated into plain English",
      "Engine hours, DEF level, aftertreatment soot load and idle time",
      "Brake wear and tire pressure across steer, drive and trailer",
      "Fuel economy, odometer, RPM, temps and battery voltage",
      "Automated monitoring — HERCULES speaks up on its own",
      "Fault codes travel with you into Breakdown Assist and parts",
    ],
    compatibility:
      "Fits Class 7 and Class 8 heavy trucks with a nine-pin Deutsch diagnostic port. Six-pin cable included.",
    fits: "Heavy trucks — 18-wheelers, flatbeds, car haul, heavy haul",
    inBox: ["THE BOLT adapter", "Six-pin cable", "Quick-start card", "Two-year warranty"],
    pairingSteps: boltPairingSteps,
    reports: [
      "mpg",
      "rpm",
      "hours",
      "odo",
      "coolant",
      "oil",
      "def",
      "aftertreatment",
      "volts",
      "idle",
      "brakes",
    ],
    hasTires: true,
    hasReadiness: false,
    faultLabel: "SPN / FMI commercial codes",
  },
  obd2: {
    kind: "obd2",
    name: "THE BOLT LT",
    tagline: "HERCULES OBD-II sixteen-pin ECU reader",
    price: 99.0,
    priceLabel: "$99.00",
    sku: "HERC-BOLT-OBD16",
    purchaseId: "boltObd",
    portName: "sixteen-pin OBD-II port",
    summary:
      "The lighter half of the range. Plugs into the standard sixteen-pin OBD-II port on cars, cargo vans, Sprinters and hotshot pickups and streams live powertrain data over Bluetooth. One-time purchase — no monthly fee.",
    unlocks: [
      "Standard powertrain fault codes translated into plain English",
      "Short and long-term fuel trim, so you catch a leak before it costs you",
      "Coolant and oil temperature, intake air temp",
      "Battery and charging voltage",
      "Emissions readiness monitors — know before you get inspected",
      "Automated monitoring, and codes carry into Breakdown Assist and parts",
    ],
    compatibility:
      "Fits any 1996-or-newer car, van or light truck with the standard sixteen-pin OBD-II port, including Class 3 through Class 5 pickups and light and medium duty.",
    fits: "Cars, cargo vans, Sprinters, van haulers, hotshot Class 3–5, light/medium duty",
    inBox: ["THE BOLT LT adapter", "Quick-start card", "Two-year warranty"],
    pairingSteps: obdPairingSteps,
    reports: ["mpg", "rpm", "odo", "coolant", "oil", "trimShort", "trimLong", "volts", "intake"],
    hasTires: false,
    hasReadiness: true,
    faultLabel: "Standard OBD-II P-codes",
  },
};

/** Kept for existing callers — the nine-pin product. */
export const BOLT = adapters.j1939;

/** Baseline frames per family. */
export function baselineFor(kind: AdapterKind): LiveValue[] {
  const set = kind === "j1939" ? boltBaseline : obdBaseline;
  return set.filter((v) => adapters[kind].reports.includes(v.key));
}

export function faultsFor(kind: AdapterKind): FaultFrame[] {
  return kind === "j1939" ? boltFaults : obdFaults;
}

export function predictionsFor(kind: AdapterKind): Prediction[] {
  return kind === "j1939" ? boltPredictions : obdPredictions;
}

export function autoAlertsFor(kind: AdapterKind) {
  return kind === "j1939" ? boltAutoAlerts : obdAutoAlerts;
}

/**
 * Which adapter a saved equipment profile needs. The profile the driver already
 * set up decides it — anything pulling a trailer or built on a heavy tractor is
 * on the nine-pin J1939 bus; everything lighter is OBD-II.
 */
export function adapterForSpec(spec: Pick<VehicleSpec, "kind" | "pullsTrailer">): AdapterKind {
  if (spec.kind === "cargoVan") return "obd2";
  return spec.pullsTrailer ? "j1939" : "obd2";
}

export function adapterForSpecReason(spec: Pick<VehicleSpec, "kind" | "pullsTrailer">): string {
  return adapterForSpec(spec) === "j1939"
    ? "Heavy truck profile — your engine talks on the J1939 bus through the nine-pin port."
    : "Light and medium duty profile — your engine talks on the standard sixteen-pin OBD-II port.";
}
