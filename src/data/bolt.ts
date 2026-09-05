/**
 * THE BOLT — the HERCULES-branded J1939 nine-pin ECU reader.
 *
 * Mock product + telemetry definitions. The shapes here mirror what a real
 * Bluetooth J1939 stream delivers (SPN/FMI fault frames plus periodic
 * parameter-group broadcasts), so a live adapter can be dropped in behind
 * `src/lib/bolt.ts` without touching the screens.
 */

export const BOLT = {
  name: "THE BOLT",
  tagline: "HERCULES J1939 nine-pin ECU reader",
  /** Placeholder price — edit this single value to change it everywhere. */
  price: 149.0,
  priceLabel: "$149.00",
  sku: "HERC-BOLT-9PIN",
  summary:
    "Plugs into your truck's nine-pin diagnostic port and streams live engine data to HERCULES over Bluetooth. One-time purchase — not part of your subscription, no monthly fee.",
  unlocks: [
    "Live fault codes translated into plain English",
    "Fuel economy, engine hours, odometer, RPM, temps, DEF and battery voltage",
    "Tire pressure, brake wear and idle time tracking",
    "Automated monitoring — HERCULES speaks up on its own",
    "Predictive maintenance warnings from your own trend data",
    "Fault codes travel with you into Breakdown Assist",
  ],
  compatibility:
    "Fits Class 3 through Class 8 trucks with a nine-pin Deutsch diagnostic port. Adapter cable available for six-pin and OBD-II ports.",
  inBox: ["THE BOLT adapter", "Quick-start card", "Two-year warranty"],
} as const;

export type FaultFrame = {
  code: string;
  spn: number;
  fmi: number;
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

export type TireFrame = { pos: string; psi: number; target: number; status: "ok" | "watch" | "alert" };

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

export type Prediction = {
  title: string;
  window: string;
  confidence: number;
  text: string;
  spoken: string;
};

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
