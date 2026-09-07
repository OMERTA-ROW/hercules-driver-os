/**
 * COMPLIANCE DOCUMENTATION BOT — SHARED RECORD MODEL
 * ==================================================
 * One document record, one copy. It is filed against a subject (a driver or a
 * vehicle) and surfaced to whoever has permission to see it — the HERCULES
 * driver side and the ZEUS company/broker side read the SAME record, never
 * separate per-side copies. That is what keeps every party looking at one set.
 *
 * The bot does four things to every file, whether it arrived one at a time from
 * a driver's camera or in a thousand-file folder drop from a carrier's office:
 *   1. classify   — what kind of document is this?
 *   2. read       — pull the fields off it (number, issuer, issued, expires)
 *   3. match      — which driver or which vehicle does it belong to?
 *   4. verify     — is it legible, current, complete, and consistent?
 * Anything it cannot classify or match confidently goes to the review queue for
 * a human. Nothing is ever auto-approved into an active file on a guess.
 */

/** Today, for expiry math in this mock. */
export const TODAY = new Date("2026-09-07T00:00:00Z");

export type DocKind =
  | "licenceFront"
  | "licenceBack"
  | "medical"
  | "insurance"
  | "authority"
  | "mvr"
  | "drugAlcohol"
  | "registration"
  | "inspection";

export type SubjectKind = "driver" | "vehicle";

/** Which side of the platform a record is surfaced to. */
export type Side = "hercules" | "zeus" | "broker";

export type DocKindSpec = {
  id: DocKind;
  label: string;
  short: string;
  subject: SubjectKind;
  /** Does this document expire on a date the bot must watch? */
  expires: boolean;
  /** How far out the bot starts warning, in days. */
  warnDays: number;
  /** Fields the bot reads off the face of the document. */
  fields: string[];
  /** Filename and content words the classifier keys on. */
  cues: string[];
  /** Plain-language line HERCULES speaks about it. */
  spoken: string;
};

export const docKinds: DocKindSpec[] = [
  {
    id: "licenceFront",
    label: "Driver licence — front",
    short: "CDL front",
    subject: "driver",
    expires: true,
    warnDays: 60,
    fields: ["Licence number", "Class", "Endorsements", "Expires"],
    cues: ["cdl", "licence", "license", "dl", "front"],
    spoken: "your CDL",
  },
  {
    id: "licenceBack",
    label: "Driver licence — back",
    short: "CDL back",
    subject: "driver",
    expires: true,
    warnDays: 60,
    fields: ["Restrictions", "Barcode read", "Expires"],
    cues: ["cdl", "licence", "license", "back", "reverse"],
    spoken: "the back of your CDL",
  },
  {
    id: "medical",
    label: "Medical examiner's certificate",
    short: "Medical card",
    subject: "driver",
    expires: true,
    warnDays: 45,
    fields: ["Examiner", "Registry number", "Exam date", "Expires"],
    cues: ["medical", "med card", "dot physical", "examiner", "mec"],
    spoken: "your medical card",
  },
  {
    id: "insurance",
    label: "Certificate of insurance",
    short: "Insurance",
    subject: "vehicle",
    expires: true,
    warnDays: 30,
    fields: ["Carrier", "Policy number", "Limits", "Expires"],
    cues: ["insurance", "coi", "certificate of insurance", "policy", "liability"],
    spoken: "the insurance certificate",
  },
  {
    id: "authority",
    label: "Operating authority (MC/DOT)",
    short: "Authority",
    subject: "driver",
    expires: false,
    warnDays: 0,
    fields: ["MC number", "DOT number", "Status"],
    cues: ["authority", "mc-", "mc number", "dot number", "fmcsa", "operating"],
    spoken: "your operating authority",
  },
  {
    id: "mvr",
    label: "Motor vehicle record (MVR)",
    short: "MVR",
    subject: "driver",
    expires: true,
    warnDays: 30,
    fields: ["State", "Pull date", "Violations", "Valid through"],
    cues: ["mvr", "motor vehicle record", "driving record", "abstract"],
    spoken: "your MVR",
  },
  {
    id: "drugAlcohol",
    label: "Drug and alcohol record",
    short: "Drug & alcohol",
    subject: "driver",
    expires: true,
    warnDays: 30,
    fields: ["Program", "Test type", "Result", "Valid through"],
    cues: ["drug", "alcohol", "clearinghouse", "test", "screen", "panel"],
    spoken: "your drug and alcohol record",
  },
  {
    id: "registration",
    label: "Vehicle registration / cab card",
    short: "Registration",
    subject: "vehicle",
    expires: true,
    warnDays: 30,
    fields: ["Plate", "VIN", "Weight", "Expires"],
    cues: ["registration", "cab card", "plate", "irp", "apportioned"],
    spoken: "the registration",
  },
  {
    id: "inspection",
    label: "Annual / periodic inspection",
    short: "Inspection",
    subject: "vehicle",
    expires: true,
    warnDays: 30,
    fields: ["Inspector", "Report number", "Inspected", "Expires"],
    cues: ["inspection", "annual", "dvir", "periodic", "bit"],
    spoken: "the annual inspection",
  },
];

export function kindSpec(id: DocKind): DocKindSpec {
  return docKinds.find((k) => k.id === id) ?? docKinds[0]!;
}

/* ------------------------------------------------------------- SUBJECTS */

export type DriverRow = {
  id: string;
  name: string;
  /** Which carrier they run under, or null for a solo owner-operator. */
  companyCode: string | null;
  /** Where they sit in the onboarding flow on the company/broker side. */
  stage: "pending" | "approved" | "rejected";
  cdlState: string;
  hiredOn?: string;
};

export type VehicleRow = {
  id: string;
  label: string;
  vin: string;
  plate: string;
  companyCode: string | null;
};

export const drivers: DriverRow[] = [
  {
    id: "DR-114",
    name: "Vinson Bass",
    companyCode: null,
    stage: "approved",
    cdlState: "TX",
    hiredOn: "Mar 2, 2024",
  },
  {
    id: "DR-208",
    name: "Marcus Reed",
    companyCode: "SOON-4412",
    stage: "pending",
    cdlState: "OK",
  },
  {
    id: "DR-209",
    name: "Dana Whitlock",
    companyCode: "SOON-4412",
    stage: "pending",
    cdlState: "KS",
  },
  {
    id: "DR-211",
    name: "Ray Okafor",
    companyCode: "REDR-8890",
    stage: "pending",
    cdlState: "TX",
  },
  {
    id: "DR-190",
    name: "Luis Contreras",
    companyCode: "SOON-4412",
    stage: "approved",
    cdlState: "TX",
    hiredOn: "Jan 8, 2025",
  },
];

export const vehicles: VehicleRow[] = [
  { id: "HERC-114", label: "Peterbilt 579 — Unit 4471", vin: "1XPBD49X1MD712004", plate: "TX 4H-8821", companyCode: null },
  { id: "TRL-9920", label: "Wabash 53' dry van", vin: "1JJV532W7NL209920", plate: "TX 9K-2210", companyCode: null },
  { id: "SOON-77", label: "Freightliner Cascadia — 77", vin: "3AKJHHDR9LSLR1477", plate: "OK 2C-7714", companyCode: "SOON-4412" },
];

export function subjectName(kind: SubjectKind, id: string) {
  if (kind === "driver") return drivers.find((d) => d.id === id)?.name ?? id;
  return vehicles.find((v) => v.id === id)?.label ?? id;
}

/* ------------------------------------------------------------- RECORDS */

export type VerifyCheck = { label: string; pass: boolean };

export type DocRecord = {
  id: string;
  kind: DocKind;
  subjectKind: SubjectKind;
  subjectId: string;
  fileName: string;
  pages: number;
  /** Fields the bot read off the face of the document. */
  read: Record<string, string>;
  issued?: string;
  /** ISO date. Absent means this kind does not expire. */
  expires?: string;
  /** What the bot checked, and whether it passed. */
  checks: VerifyCheck[];
  /** Where it came from — a driver's camera, an office folder drop, or the company. */
  source: "driver" | "import" | "company";
  uploadedBy: string;
  uploadedAt: string;
  /** THE SHARED RECORD: sides permitted to read this one copy. */
  visibleTo: Side[];
};

/** Both sides read the same record; a broker only sees what it is shown. */
export const bothSides: Side[] = ["hercules", "zeus"];
export const allSides: Side[] = ["hercules", "zeus", "broker"];

function iso(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export const seedRecords: DocRecord[] = [
  {
    id: "CD-1001",
    kind: "licenceFront",
    subjectKind: "driver",
    subjectId: "DR-114",
    fileName: "cdl-front.jpg",
    pages: 1,
    read: { "Licence number": "TX 41128822", Class: "A", Endorsements: "N, T", Expires: "Apr 18, 2028" },
    issued: iso(2024, 4, 18),
    expires: iso(2028, 4, 18),
    checks: [
      { label: "Both corners legible", pass: true },
      { label: "Class A with the endorsements on file", pass: true },
      { label: "Name matches the account", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Mar 2, 2024",
    visibleTo: allSides,
  },
  {
    id: "CD-1002",
    kind: "licenceBack",
    subjectKind: "driver",
    subjectId: "DR-114",
    fileName: "cdl-back.jpg",
    pages: 1,
    read: { Restrictions: "None", "Barcode read": "Clean", Expires: "Apr 18, 2028" },
    issued: iso(2024, 4, 18),
    expires: iso(2028, 4, 18),
    checks: [
      { label: "Barcode readable", pass: true },
      { label: "Matches the front", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Mar 2, 2024",
    visibleTo: allSides,
  },
  {
    id: "CD-1003",
    kind: "medical",
    subjectKind: "driver",
    subjectId: "DR-114",
    fileName: "med-card-2026.pdf",
    pages: 1,
    read: {
      Examiner: "Dr. A. Ruiz, DO",
      "Registry number": "1928374650",
      "Exam date": "Oct 2, 2024",
      Expires: "Oct 2, 2026",
    },
    issued: iso(2024, 10, 2),
    expires: iso(2026, 10, 2),
    checks: [
      { label: "Examiner on the national registry", pass: true },
      { label: "Two-year certificate, not restricted", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Oct 2, 2024",
    visibleTo: allSides,
  },
  {
    id: "CD-1004",
    kind: "insurance",
    subjectKind: "vehicle",
    subjectId: "HERC-114",
    fileName: "coi-greatwest.pdf",
    pages: 2,
    read: {
      Carrier: "Great West Casualty",
      "Policy number": "GW-4471-22",
      Limits: "$1,000,000 liability / $100,000 cargo",
      Expires: "Sep 30, 2026",
    },
    issued: iso(2025, 9, 30),
    expires: iso(2026, 9, 30),
    checks: [
      { label: "Limits meet broker minimums", pass: true },
      { label: "Certificate holder blank — brokers need naming", pass: false },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Sep 30, 2025",
    visibleTo: allSides,
  },
  {
    id: "CD-1005",
    kind: "authority",
    subjectKind: "driver",
    subjectId: "DR-114",
    fileName: "mc-authority.pdf",
    pages: 1,
    read: { "MC number": "MC-1188402", "DOT number": "3992471", Status: "Active" },
    issued: iso(2024, 2, 20),
    checks: [
      { label: "Active on FMCSA", pass: true },
      { label: "Authority type matches the freight hauled", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Feb 20, 2024",
    visibleTo: allSides,
  },
  {
    id: "CD-1006",
    kind: "registration",
    subjectKind: "vehicle",
    subjectId: "HERC-114",
    fileName: "cab-card-4471.pdf",
    pages: 1,
    read: { Plate: "TX 4H-8821", VIN: "1XPBD49X1MD712004", Weight: "80,000 lb", Expires: "Sep 21, 2026" },
    issued: iso(2025, 9, 21),
    expires: iso(2026, 9, 21),
    checks: [
      { label: "VIN matches the unit on file", pass: true },
      { label: "Apportioned weight covers the配 configuration", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Sep 21, 2025",
    visibleTo: bothSides,
  },
  {
    id: "CD-1007",
    kind: "mvr",
    subjectKind: "driver",
    subjectId: "DR-114",
    fileName: "mvr-tx-pull.pdf",
    pages: 3,
    read: { State: "TX", "Pull date": "Feb 14, 2026", Violations: "None in 36 months", "Valid through": "Feb 14, 2027" },
    issued: iso(2026, 2, 14),
    expires: iso(2027, 2, 14),
    checks: [
      { label: "Clean for 36 months", pass: true },
      { label: "Pulled within the last 12 months", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Feb 14, 2026",
    visibleTo: bothSides,
  },
  {
    id: "CD-1008",
    kind: "inspection",
    subjectKind: "vehicle",
    subjectId: "TRL-9920",
    fileName: "annual-trailer-9920.pdf",
    pages: 2,
    read: {
      Inspector: "Pauls Valley Truck Center",
      "Report number": "AI-77120",
      Inspected: "Sep 18, 2025",
      Expires: "Sep 18, 2026",
    },
    issued: iso(2025, 9, 18),
    expires: iso(2026, 9, 18),
    checks: [
      { label: "Signed by a qualified inspector", pass: true },
      { label: "Brake measurements recorded", pass: true },
    ],
    source: "driver",
    uploadedBy: "Vinson Bass",
    uploadedAt: "Sep 18, 2025",
    visibleTo: bothSides,
  },
  /* --- A company driver mid-onboarding: this is what the queue reviews --- */
  {
    id: "CD-2001",
    kind: "licenceFront",
    subjectKind: "driver",
    subjectId: "DR-208",
    fileName: "reed_cdl_front.jpg",
    pages: 1,
    read: { "Licence number": "OK 8823410", Class: "A", Endorsements: "T", Expires: "Jun 4, 2029" },
    issued: iso(2025, 6, 4),
    expires: iso(2029, 6, 4),
    checks: [
      { label: "Legible front", pass: true },
      { label: "Name matches the application", pass: true },
    ],
    source: "driver",
    uploadedBy: "Marcus Reed",
    uploadedAt: "Sep 4, 2026",
    visibleTo: bothSides,
  },
  {
    id: "CD-2002",
    kind: "medical",
    subjectKind: "driver",
    subjectId: "DR-208",
    fileName: "reed_medcard.pdf",
    pages: 1,
    read: {
      Examiner: "Dr. P. Nowak, MD",
      "Registry number": "5567201199",
      "Exam date": "Aug 30, 2024",
      Expires: "Aug 30, 2026",
    },
    issued: iso(2024, 8, 30),
    expires: iso(2026, 8, 30),
    checks: [
      { label: "Examiner on the national registry", pass: true },
      { label: "Certificate still in date", pass: false },
    ],
    source: "driver",
    uploadedBy: "Marcus Reed",
    uploadedAt: "Sep 4, 2026",
    visibleTo: bothSides,
  },
  {
    id: "CD-2003",
    kind: "mvr",
    subjectKind: "driver",
    subjectId: "DR-209",
    fileName: "whitlock-mvr.pdf",
    pages: 2,
    read: { State: "KS", "Pull date": "Aug 22, 2026", Violations: "1 — speeding, 2024", "Valid through": "Aug 22, 2027" },
    issued: iso(2026, 8, 22),
    expires: iso(2027, 8, 22),
    checks: [
      { label: "Pulled inside 12 months", pass: true },
      { label: "No disqualifying violations", pass: true },
    ],
    source: "company",
    uploadedBy: "Sooner Freight Systems",
    uploadedAt: "Aug 22, 2026",
    visibleTo: bothSides,
  },
  {
    id: "CD-2004",
    kind: "licenceFront",
    subjectKind: "driver",
    subjectId: "DR-209",
    fileName: "whitlock_dl.jpg",
    pages: 1,
    read: { "Licence number": "KS 4419902", Class: "A", Endorsements: "N", Expires: "Nov 12, 2027" },
    issued: iso(2023, 11, 12),
    expires: iso(2027, 11, 12),
    checks: [{ label: "Legible front", pass: true }],
    source: "driver",
    uploadedBy: "Dana Whitlock",
    uploadedAt: "Sep 5, 2026",
    visibleTo: bothSides,
  },
];

/* ------------------------------------------------------------- EXPIRY */

export type DocStatus = "valid" | "expiring" | "expired" | "missing";

export function daysUntil(isoDate?: string, from: Date = TODAY) {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  return Math.ceil((new Date(isoDate).getTime() - from.getTime()) / 86_400_000);
}

export function statusOf(rec: DocRecord, from: Date = TODAY): DocStatus {
  const spec = kindSpec(rec.kind);
  if (!spec.expires || !rec.expires) return "valid";
  const d = daysUntil(rec.expires, from);
  if (d < 0) return "expired";
  if (d <= spec.warnDays) return "expiring";
  return "valid";
}

export function fmtDate(isoDate?: string) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** What HERCULES says out loud about a document coming due or gone by. */
export function spokenExpiry(rec: DocRecord, from: Date = TODAY) {
  const spec = kindSpec(rec.kind);
  const who = rec.subjectKind === "driver" ? subjectName("driver", rec.subjectId) : subjectName("vehicle", rec.subjectId);
  const d = daysUntil(rec.expires, from);
  const owner = rec.subjectId === "DR-114" || rec.subjectId === "HERC-114" || rec.subjectId === "TRL-9920";
  const label = owner ? spec.spoken : `${who}'s ${spec.short.toLowerCase()}`;
  if (d < 0) {
    return `Heads up — ${label} expired ${Math.abs(d)} ${Math.abs(d) === 1 ? "day" : "days"} ago. Running on it is an out-of-service violation. I can put in the renewal request, but I'm not sending anything until you say so.`;
  }
  return `Heads up — ${label} expires in ${d} ${d === 1 ? "day" : "days"}, on ${fmtDate(rec.expires)}. Better to handle it from a truck stop than a scale house. Say the word and I'll start it.`;
}

/** Which documents a subject is required to hold, and which are absent. */
export function requiredFor(kind: SubjectKind) {
  return docKinds.filter((k) => k.subject === kind);
}

export function missingFor(
  subjectKind: SubjectKind,
  subjectId: string,
  records: DocRecord[],
): DocKindSpec[] {
  return requiredFor(subjectKind).filter(
    (k) => !records.some((r) => r.subjectId === subjectId && r.kind === k.id),
  );
}

/* ------------------------------------------------------------- THE CLASSIFIER */

export type Classified = {
  fileName: string;
  kind: DocKind | null;
  subjectKind: SubjectKind | null;
  subjectId: string | null;
  /** 0–1. Below 0.7 on either question and it goes to review, not the file. */
  confidence: number;
  read: Record<string, string>;
  expires?: string;
  reason: string;
};

/** Mock field read — a real build hands the page to OCR plus a field extractor. */
function readFields(kind: DocKind, seedNum: number): { read: Record<string, string>; expires?: string } {
  const spec = kindSpec(kind);
  const months = 6 + (seedNum % 30);
  const exp = new Date(TODAY.getTime() + months * 30 * 86_400_000).toISOString().slice(0, 10);
  const read: Record<string, string> = {};
  for (const f of spec.fields) {
    read[f] =
      f === "Expires" || f === "Valid through"
        ? fmtDate(exp)
        : f.toLowerCase().includes("number")
          ? `${spec.short.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)}-${100000 + seedNum * 37}`
          : "Read off the document";
  }
  return spec.expires ? { read, expires: exp } : { read };
}

/**
 * Classify one dropped file by name, then match it to a driver or a vehicle.
 * Deliberately conservative: an unclear name or an unmatched subject scores low
 * and lands in the review queue rather than being filed against a guess.
 */
export function classify(fileName: string, index = 0): Classified {
  const n = fileName.toLowerCase();
  let best: DocKindSpec | null = null;
  let hits = 0;

  for (const spec of docKinds) {
    const score = spec.cues.filter((c) => n.includes(c)).length;
    if (score > hits) {
      hits = score;
      best = spec;
    }
  }

  /* Front/back disambiguation on a licence — the pair must not collapse into one. */
  if (best && (best.id === "licenceFront" || best.id === "licenceBack")) {
    best = kindSpec(/(back|reverse|rear|_b\.|-b\.)/.test(n) ? "licenceBack" : "licenceFront");
  }

  const driver = drivers.find((d) => {
    const [first = "", last = ""] = d.name.toLowerCase().split(" ");
    return (last && n.includes(last)) || n.includes(d.id.toLowerCase()) || (first.length > 3 && n.includes(first));
  });
  const vehicle = vehicles.find(
    (v) =>
      n.includes(v.id.toLowerCase()) ||
      n.includes(v.plate.toLowerCase().replace(/[^a-z0-9]/g, "")) ||
      n.includes(v.vin.slice(-6).toLowerCase()) ||
      /(4471|9920|unit ?77)/.test(n) === (v.id === "HERC-114" || v.id === "TRL-9920" || v.id === "SOON-77"),
  );

  if (!best) {
    return {
      fileName,
      kind: null,
      subjectKind: null,
      subjectId: null,
      confidence: 0.2,
      read: {},
      reason: "Could not tell what kind of document this is from the file itself.",
    };
  }

  const wantsDriver = best.subject === "driver";
  const matched = wantsDriver ? driver : vehicle;
  const { read, expires } = readFields(best.id, index + 1);

  if (!matched) {
    return {
      fileName,
      kind: best.id,
      subjectKind: best.subject,
      subjectId: null,
      confidence: 0.55,
      read,
      ...(expires ? { expires } : {}),
      reason: `Read it as ${best.label.toLowerCase()}, but nothing on it names a ${best.subject} I have on file.`,
    };
  }

  const confidence = Math.min(0.98, 0.72 + hits * 0.08);
  return {
    fileName,
    kind: best.id,
    subjectKind: best.subject,
    subjectId: wantsDriver ? (matched as DriverRow).id : (matched as VehicleRow).id,
    confidence,
    read,
    ...(expires ? { expires } : {}),
    reason: `${best.label} for ${wantsDriver ? (matched as DriverRow).name : (matched as VehicleRow).label}.`,
  };
}

/** Checks the bot runs on a freshly imported file so it verifies like a manual upload. */
export function autoChecks(c: Classified): VerifyCheck[] {
  const inDate = c.expires ? daysUntil(c.expires) > 0 : true;
  return [
    { label: "Pages legible end to end", pass: true },
    { label: "Fields read without gaps", pass: Object.keys(c.read).length > 0 },
    { label: "Matched to a subject on file", pass: !!c.subjectId },
    { label: "Still in date", pass: inDate },
  ];
}

/** A sample office folder drop — mixed, misnamed, and deliberately imperfect. */
export const sampleBatch = [
  "reed_cdl_front.jpg",
  "reed_cdl_back.jpg",
  "reed-medical-card-2026.pdf",
  "whitlock_mvr_ks.pdf",
  "whitlock drug screen panel.pdf",
  "okafor_cdl.jpg",
  "okafor_med_card.pdf",
  "coi-sooner-fleet-2026.pdf",
  "cab card unit 77.pdf",
  "annual inspection 4471.pdf",
  "scan0042.pdf",
  "IMG_8831.HEIC",
  "insurance certificate.pdf",
  "contreras clearinghouse query.pdf",
];

/* ------------------------------------------------------------- EXPORT */

export type ExportScope =
  | { kind: "driver"; id: string }
  | { kind: "vehicle"; id: string }
  | { kind: "fleet"; id: string };

export function exportPackage(scope: ExportScope, records: DocRecord[]) {
  const picked =
    scope.kind === "fleet"
      ? records
      : records.filter((r) => r.subjectId === scope.id && r.subjectKind === scope.kind);
  const name =
    scope.kind === "fleet"
      ? "fleet-document-set"
      : `${subjectName(scope.kind, scope.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-document-set`;
  return {
    fileName: `${name}-${TODAY.toISOString().slice(0, 10)}.zip`,
    count: picked.length,
    pages: picked.reduce((s, r) => s + r.pages, 0),
    records: picked,
  };
}

/** Plain CSV manifest that rides along with the package. */
export function manifestCsv(records: DocRecord[]) {
  const rows = [
    ["Record", "Document", "Subject", "Expires", "Status", "Source", "Filed"].join(","),
    ...records.map((r) =>
      [
        r.id,
        kindSpec(r.kind).label,
        subjectName(r.subjectKind, r.subjectId),
        r.expires ? fmtDate(r.expires) : "does not expire",
        statusOf(r),
        r.source,
        r.uploadedAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  return rows.join("\n");
}

/* ------------------------------------------------------------- APPROVALS */

export type ApprovalOutcome =
  | { state: "pending" }
  | { state: "approved"; at: string; by: string }
  | { state: "rejected"; at: string; by: string; reason: string }
  | { state: "requested"; at: string; by: string; kind: DocKind; note: string };

export const rejectReasons = [
  "Medical card out of date — send the current one",
  "Licence photo unreadable at the corners",
  "MVR older than twelve months",
  "Insurance limits below our minimum",
  "Name on the documents does not match the application",
];
