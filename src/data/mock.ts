// Mock data for the HERCULES first pass. No backend yet.

export const driver = {
  name: "Vinson Bass",
  callsign: "HERC-114",
  truck: "2021 Freightliner Cascadia",
  unit: "Unit 4471",
  authority: "Lease Owner-Operator",
  trailer: "53' Dry Van · T-8890",
};

export const currentLoad = {
  id: "LD-88214",
  broker: "Ridgeline Logistics",
  commodity: "Palletized bottled water · 41,200 lbs",
  origin: "Laredo, TX",
  destination: "Oklahoma City, OK",
  pickupAt: "Today 06:15",
  deliverBy: "Tomorrow 08:00",
  rate: 2840,
  miles: 662,
  milesRemaining: 214,
  etaLocal: "19:42",
  deadhead: 18,
  rpm: 4.29,
  costPerMile: 1.86,
  profitPerMile: 2.43,
  status: "In transit",
};

export const hos = {
  driveRemainingMin: 246,
  driveTotalMin: 660,
  onDutyRemainingMin: 312,
  onDutyTotalMin: 840,
  breakInMin: 92,
  cycleRemainingHrs: 41.5,
  cycleTotalHrs: 70,
};

export type Facility = {
  name: string;
  open: string;
  close: string;
  hours24: boolean;
  weekend: string;
  appointment: "Appointment" | "First come, first served";
  onSiteParking: boolean;
  overnightAllowed: boolean;
  nearestSafeParking: string;
  nearestSafeParkingMiles: number;
  notes: string;
};

export type Load = {
  id: string;
  broker: string;
  brokerScore: number;
  commodity: string;
  origin: string;
  destination: string;
  pickupWindow: string;
  deliveryWindow: string;
  rate: number;
  miles: number;
  deadhead: number;
  rpm: number;
  estFuel: number;
  estTolls: number;
  estProfit: number;
  hosFit: "Fits your clock" | "Tight on your clock" | "Needs a reset";
  shipper: Facility;
  receiver: Facility;
};

export const loads: Load[] = [
  {
    id: "LB-40921",
    broker: "Cardinal Freight Partners",
    brokerScore: 94,
    commodity: "Canned goods · 38,400 lbs",
    origin: "Oklahoma City, OK",
    destination: "Memphis, TN",
    pickupWindow: "Tomorrow 09:00 – 13:00",
    deliveryWindow: "Fri 07:00 – 11:00",
    rate: 1980,
    miles: 466,
    deadhead: 12,
    rpm: 4.25,
    estFuel: 412,
    estTolls: 0,
    estProfit: 706,
    hosFit: "Fits your clock",
    shipper: {
      name: "Sooner Distribution Center · Dock 12",
      open: "06:00",
      close: "22:00",
      hours24: false,
      weekend: "Closed Sunday",
      appointment: "Appointment",
      onSiteParking: true,
      overnightAllowed: true,
      nearestSafeParking: "Love's #412, I-40 Exit 137",
      nearestSafeParkingMiles: 3.1,
      notes: "Drop trailer available. Lumper $95, reimbursed.",
    },
    receiver: {
      name: "Delta Grocery Warehouse",
      open: "00:00",
      close: "24:00",
      hours24: true,
      weekend: "Open 7 days",
      appointment: "First come, first served",
      onSiteParking: true,
      overnightAllowed: false,
      nearestSafeParking: "TA Memphis West, Exit 12B",
      nearestSafeParkingMiles: 6.4,
      notes: "Guard shack requires PPE: vest, boots, glasses.",
    },
  },
  {
    id: "LB-40877",
    broker: "Vertex Transport Brokerage",
    brokerScore: 71,
    commodity: "Auto parts · 22,150 lbs",
    origin: "Oklahoma City, OK",
    destination: "Kansas City, MO",
    pickupWindow: "Tomorrow 14:00 – 16:00",
    deliveryWindow: "Fri 06:00 – 08:00",
    rate: 1120,
    miles: 353,
    deadhead: 26,
    rpm: 3.17,
    estFuel: 318,
    estTolls: 21,
    estProfit: 289,
    hosFit: "Tight on your clock",
    shipper: {
      name: "Midwest Parts Cross-Dock",
      open: "07:00",
      close: "15:30",
      hours24: false,
      weekend: "Closed Sat & Sun",
      appointment: "Appointment",
      onSiteParking: false,
      overnightAllowed: false,
      nearestSafeParking: "Pilot #221, I-35 Exit 51",
      nearestSafeParkingMiles: 8.9,
      notes: "No overnight staging. Yard is tight for a 53' — back in from north gate.",
    },
    receiver: {
      name: "KC Assembly Plant · Gate 4",
      open: "05:00",
      close: "23:00",
      hours24: false,
      weekend: "Closed Sunday",
      appointment: "Appointment",
      onSiteParking: false,
      overnightAllowed: false,
      nearestSafeParking: "Truck lot, 3rd St & Bell",
      nearestSafeParkingMiles: 4.2,
      notes: "Detention pays after 2 hrs at $65/hr.",
    },
  },
  {
    id: "LB-41003",
    broker: "Highline Load Services",
    brokerScore: 88,
    commodity: "Paper products · 44,800 lbs",
    origin: "Tulsa, OK",
    destination: "Denver, CO",
    pickupWindow: "Tomorrow 08:00 – 12:00",
    deliveryWindow: "Sat 10:00 – 14:00",
    rate: 3410,
    miles: 723,
    deadhead: 106,
    rpm: 4.72,
    estFuel: 648,
    estTolls: 0,
    estProfit: 1184,
    hosFit: "Needs a reset",
    shipper: {
      name: "Green River Paper Mill",
      open: "00:00",
      close: "24:00",
      hours24: true,
      weekend: "Open 7 days",
      appointment: "First come, first served",
      onSiteParking: true,
      overnightAllowed: true,
      nearestSafeParking: "On-site driver lot, 40 spaces",
      nearestSafeParkingMiles: 0,
      notes: "Restrooms and showers on site. Free overnight before load.",
    },
    receiver: {
      name: "Front Range Distribution · Aurora",
      open: "06:00",
      close: "18:00",
      hours24: false,
      weekend: "Saturday until 14:00, closed Sunday",
      appointment: "Appointment",
      onSiteParking: true,
      overnightAllowed: false,
      nearestSafeParking: "Sapp Bros Denver, I-76 Exit 12",
      nearestSafeParkingMiles: 11.8,
      notes: "Chain law can be active on I-70 west of Limon in winter.",
    },
  },
  {
    id: "LB-40950",
    broker: "Anvil Freight Group",
    brokerScore: 82,
    commodity: "Beverage reefer · 39,900 lbs",
    origin: "Norman, OK",
    destination: "Dallas, TX",
    pickupWindow: "Tomorrow 10:30 – 12:30",
    deliveryWindow: "Fri 04:00 – 06:00",
    rate: 1290,
    miles: 227,
    deadhead: 21,
    rpm: 5.68,
    estFuel: 204,
    estTolls: 14,
    estProfit: 648,
    hosFit: "Fits your clock",
    shipper: {
      name: "Norman Bottling Co.",
      open: "05:30",
      close: "20:00",
      hours24: false,
      weekend: "Closed Sunday",
      appointment: "Appointment",
      onSiteParking: true,
      overnightAllowed: true,
      nearestSafeParking: "On-site gravel lot, 12 spaces",
      nearestSafeParkingMiles: 0,
      notes: "Reefer set to 36°F. Pre-cool before arrival.",
    },
    receiver: {
      name: "Metroplex Cold Storage",
      open: "00:00",
      close: "24:00",
      hours24: true,
      weekend: "Open 7 days",
      appointment: "First come, first served",
      onSiteParking: false,
      overnightAllowed: false,
      nearestSafeParking: "QT Travel Center, Hwy 67",
      nearestSafeParkingMiles: 5.6,
      notes: "Night unloads are fastest — typical 45 min turn.",
    },
  },
];

export type HealthMetric = {
  label: string;
  value: string;
  unit?: string;
  status: "ok" | "watch" | "alert";
  detail: string;
  pct?: number;
};

export const truckHealth: HealthMetric[] = [
  {
    label: "Fuel economy (live)",
    value: "7.4",
    unit: "MPG",
    status: "ok",
    detail: "Trip average 7.1 · rolling 30-day 6.9",
    pct: 74,
  },
  {
    label: "Engine hours",
    value: "14,208",
    unit: "hrs",
    status: "ok",
    detail: "Next service interval at 14,500 hrs",
    pct: 62,
  },
  {
    label: "Odometer",
    value: "612,447",
    unit: "mi",
    status: "ok",
    detail: "Since last PM: 11,320 mi",
  },
  {
    label: "Coolant temp",
    value: "214",
    unit: "°F",
    status: "watch",
    detail: "Running 9°F above your 30-day norm on grades",
    pct: 82,
  },
  {
    label: "Oil temp",
    value: "228",
    unit: "°F",
    status: "ok",
    detail: "Within normal band (205–240°F)",
    pct: 66,
  },
  {
    label: "DEF level",
    value: "38",
    unit: "%",
    status: "watch",
    detail: "About 1,050 mi remaining — top off in OKC",
    pct: 38,
  },
  {
    label: "Idle time (today)",
    value: "2h 41m",
    status: "watch",
    detail: "Costing roughly $11.40 in fuel today",
    pct: 44,
  },
  {
    label: "Brake wear (steer)",
    value: "58",
    unit: "%",
    status: "ok",
    detail: "Est. 42,000 mi remaining",
    pct: 58,
  },
];

export const faultCodes = [
  {
    code: "SPN 3251 / FMI 2",
    system: "Aftertreatment",
    severity: "watch" as const,
    text: "DPF differential pressure erratic. Not derating. Watch on next regen.",
    firstSeen: "2 days ago · 3 occurrences",
  },
  {
    code: "SPN 110 / FMI 16",
    system: "Cooling",
    severity: "alert" as const,
    text: "Coolant temperature above normal range under load.",
    firstSeen: "Today 13:22 · 1 occurrence",
  },
];

export const tires = [
  { pos: "Steer LF", psi: 108, target: 110, status: "ok" as const },
  { pos: "Steer RF", psi: 105, target: 110, status: "watch" as const },
  { pos: "Drive LFO", psi: 98, target: 100, status: "ok" as const },
  { pos: "Drive LFI", psi: 99, target: 100, status: "ok" as const },
  { pos: "Drive RFI", psi: 88, target: 100, status: "alert" as const },
  { pos: "Drive RFO", psi: 97, target: 100, status: "ok" as const },
  { pos: "Trailer LR", psi: 101, target: 100, status: "ok" as const },
  { pos: "Trailer RR", psi: 96, target: 100, status: "watch" as const },
];

export const predictions = [
  {
    title: "Right drive inner tire losing 3 psi/day",
    window: "Address within 2 days",
    confidence: 91,
    text: "Pattern matches a slow valve stem leak. Suggested: check at your OKC delivery, 4 mi from a tire shop that takes walk-ins.",
  },
  {
    title: "DPF regen likely in ~600 mi",
    window: "Plan a highway stretch",
    confidence: 78,
    text: "Suggested: let it complete on I-40 rather than in a city stop-and-go run.",
  },
  {
    title: "Coolant system trending warm",
    window: "Inspect within 1,500 mi",
    confidence: 64,
    text: "Suggested: fan clutch and radiator wash at your next PM. No derate risk today.",
  },
];

export const settlements = [
  { id: "ST-2291", period: "Aug 18 – Aug 24", gross: 8420, deductions: 2810, net: 5610, status: "Paid" },
  { id: "ST-2298", period: "Aug 25 – Aug 31", gross: 7960, deductions: 2645, net: 5315, status: "Paid" },
  { id: "ST-2305", period: "Sep 1 – Sep 7", gross: 6240, deductions: 2190, net: 4050, status: "Pending" },
];

export const loadPnL = [
  { id: "LD-88214", lane: "Laredo → OKC", miles: 662, revenue: 2840, fuel: 596, tolls: 0, other: 145, profit: 2099 },
  { id: "LD-88190", lane: "Dallas → Laredo", miles: 431, revenue: 1520, fuel: 389, tolls: 18, other: 95, profit: 1018 },
  { id: "LD-88171", lane: "Little Rock → Dallas", miles: 318, revenue: 1180, fuel: 287, tolls: 0, other: 60, profit: 833 },
  { id: "LD-88144", lane: "Memphis → Little Rock", miles: 137, revenue: 620, fuel: 124, tolls: 0, other: 40, profit: 456 },
];

export const fuelStops = [
  { station: "Love's #412 · OKC, OK", gallons: 92.4, ppg: 3.61, total: 333.6, state: "OK" },
  { station: "Pilot #77 · Dallas, TX", gallons: 118.2, ppg: 3.48, total: 411.3, state: "TX" },
  { station: "TA · Little Rock, AR", gallons: 74.8, ppg: 3.72, total: 278.3, state: "AR" },
];

export const iftaByState = [
  { state: "TX", miles: 1420, gallons: 198, net: -18.4 },
  { state: "OK", miles: 880, gallons: 122, net: 12.9 },
  { state: "AR", miles: 410, gallons: 61, net: 6.1 },
  { state: "TN", miles: 260, gallons: 36, net: 4.8 },
];

export const detention = [
  { load: "LD-88190", facility: "Laredo Cross-Dock", waited: "3h 40m", billable: "1h 40m", amount: 108, status: "Invoiced" },
  { load: "LD-88171", facility: "Dallas Regional DC", waited: "2h 15m", billable: "15m", amount: 16, status: "Paid" },
  { load: "LD-88214", facility: "Laredo Bottling", waited: "1h 05m", billable: "0m", amount: 0, status: "Under threshold" },
];

export const weeklySeries = [
  { day: "Mon", revenue: 1180, cost: 410 },
  { day: "Tue", revenue: 1520, cost: 502 },
  { day: "Wed", revenue: 940, cost: 366 },
  { day: "Thu", revenue: 2840, cost: 741 },
  { day: "Fri", revenue: 1290, cost: 418 },
  { day: "Sat", revenue: 620, cost: 164 },
  { day: "Sun", revenue: 0, cost: 0 },
];

export type DriverAlert = {
  id: string;
  kind: "DOT checkpoint" | "Scale open" | "Inspection activity" | "Road hazard" | "Weigh station closed";
  location: string;
  road: string;
  milesAhead: number;
  reportedAgo: string;
  confirmations: number;
  reporter: string;
  note: string;
  severity: "high" | "medium" | "low";
};

export const alerts: DriverAlert[] = [
  {
    id: "AL-7781",
    kind: "DOT checkpoint",
    location: "I-35 NB near Purcell, OK",
    road: "I-35 N · MM 91",
    milesAhead: 34,
    reportedAgo: "12 min ago",
    confirmations: 9,
    reporter: "Driver 4-1-9",
    note: "Two units pulling trucks into the pit. Have your logs and paperwork ready.",
    severity: "high",
  },
  {
    id: "AL-7774",
    kind: "Scale open",
    location: "Ardmore, OK weigh station",
    road: "I-35 N · MM 22",
    milesAhead: 96,
    reportedAgo: "34 min ago",
    confirmations: 14,
    reporter: "Driver 7-7-2",
    note: "Open and staffed. Good time to double-check straps and mud flaps.",
    severity: "medium",
  },
  {
    id: "AL-7769",
    kind: "Inspection activity",
    location: "Level 2 inspections, Chickasha rest area",
    road: "I-44 W · MM 83",
    milesAhead: 61,
    reportedAgo: "1 hr ago",
    confirmations: 6,
    reporter: "Driver 2-0-5",
    note: "Walkarounds and light checks. Worth a pre-trip before you roll through.",
    severity: "medium",
  },
  {
    id: "AL-7752",
    kind: "Weigh station closed",
    location: "Wichita Falls, TX",
    road: "US-287 S",
    milesAhead: 148,
    reportedAgo: "2 hrs ago",
    confirmations: 11,
    reporter: "Driver 8-8-1",
    note: "Lights off, bypass lane open.",
    severity: "low",
  },
  {
    id: "AL-7740",
    kind: "Road hazard",
    location: "Shredded steer casing in right lane",
    road: "I-40 E · MM 152",
    milesAhead: 22,
    reportedAgo: "18 min ago",
    confirmations: 4,
    reporter: "Driver 3-3-6",
    note: "Debris across right lane, move left early.",
    severity: "high",
  },
];

export const preTripChecklist = [
  "Logs current and certified",
  "Registration, IFTA, insurance in reach",
  "Lights, flaps, and reflectors clean",
  "Load secured, seal number matches BOL",
  "Tire pressures and brake slack checked",
  "Medical card and CDL on person",
];

export const fatigueModel = {
  peakHours: "05:00 – 11:00",
  dipHours: "14:30 – 16:30",
  hardWall: "After 21:30",
  avgSleep: "6h 42m",
  sleepConsistency: 78,
  restQuality: 71,
  daysObserved: 148,
  personalNote:
    "Your alertness holds strong for the first six hours after a full break, then drops noticeably in the mid-afternoon. This is your pattern, not a rule.",
};

export const alertnessCurve = [
  { hour: "04", you: 62, fleet: 55 },
  { hour: "06", you: 88, fleet: 74 },
  { hour: "08", you: 94, fleet: 82 },
  { hour: "10", you: 91, fleet: 84 },
  { hour: "12", you: 79, fleet: 78 },
  { hour: "14", you: 61, fleet: 71 },
  { hour: "16", you: 58, fleet: 68 },
  { hour: "18", you: 72, fleet: 66 },
  { hour: "20", you: 64, fleet: 58 },
  { hour: "22", you: 41, fleet: 49 },
];

export const breakSuggestions = [
  {
    when: "In 1h 32m · Chandler, OK",
    why: "Matches the front edge of your afternoon dip. 28 min would put you back above your own alertness average.",
    place: "Love's #398 — 42 spaces open, showers, hot food",
  },
  {
    when: "Tonight around 20:45 · Edmond, OK",
    why: "You sleep best when you shut down before 21:30. Delivery window still clears with 2h 10m of slack.",
    place: "Flying J — reserved parking available, quiet back row",
  },
];

export const rhythmStats = [
  { label: "Avg. shutdown time", value: "20:58" },
  { label: "Avg. roll-out time", value: "05:12" },
  { label: "Best-performing shift", value: "Early morning" },
  { label: "Longest safe stretch", value: "6h 20m" },
];

export const voiceCommands = [
  { phrase: "Hercules, what's my clock?", desc: "Reads drive, on-duty, and cycle time aloud" },
  { phrase: "Find me a load out of Oklahoma City", desc: "Searches the board and reads the top three" },
  { phrase: "Is the receiver open overnight?", desc: "Reads facility hours and parking for the load" },
  { phrase: "What's my profit per mile right now?", desc: "Live margin on the current run" },
  { phrase: "Any DOT ahead of me?", desc: "Reads driver alerts within 100 miles" },
  { phrase: "Read my fault codes", desc: "ECM faults in plain language" },
  { phrase: "Where can I park tonight?", desc: "Safe parking near your projected stop" },
  { phrase: "Reset my day", desc: "Recalculates hours, route, rest, food, and finds new loads" },
  { phrase: "Log 40 minutes of detention", desc: "Starts a billable detention timer" },
  { phrase: "Report a scale open on I-35", desc: "Posts a warning to nearby drivers" },
  {
    phrase: "Upload my BOL for load 4471",
    desc: "Opens the camera with the type and load already filled in",
  },
  { phrase: "Scan my fuel receipts", desc: "Multi-page capture, grouped into one document" },
  {
    phrase: "Send my POD to factoring",
    desc: "Reads it back and waits for your approval before sending",
  },
];

export const transcript = [
  { from: "driver" as const, text: "Hercules, what's my clock?" },
  {
    from: "hercules" as const,
    text: "You have 4 hours 6 minutes of drive time and 5 hours 12 minutes on duty. Your 30-minute break is due in 1 hour 32 minutes. You can make Oklahoma City with 1 hour 48 minutes to spare.",
  },
  { from: "driver" as const, text: "Any DOT ahead of me?" },
  {
    from: "hercules" as const,
    text: "One report 34 miles ahead on I-35 northbound near Purcell. Nine drivers confirmed it. Plenty of time to get your paperwork and pre-trip in order and roll through prepared and compliant.",
  },
  { from: "driver" as const, text: "What would a reset look like if my delivery slips?" },
  {
    from: "hercules" as const,
    text: "I can rebuild the day: new rest window at Chandler, fuel at Love's 398, and three replacement loads out of Oklahoma City. Nothing changes until you approve it.",
  },
];

export const resetPlan = [
  { label: "Hours", detail: "Rebuilt clock: 4h 06m drive left, 30-min break moved to 16:10" },
  { label: "Route", detail: "I-35 N to OKC, avoiding the Purcell backup — 214 mi, ETA 19:42" },
  { label: "Parking", detail: "Love's #398 Chandler, 42 spaces open · backup: Flying J Edmond" },
  { label: "Food", detail: "Hot food and showers at both stops, open past 22:00" },
  { label: "Rest", detail: "Shutdown 20:45 to match your rhythm model, 10h off" },
  { label: "Loads", detail: "4 replacement loads surfacing out of OKC, best at $4.72/mi" },
];
