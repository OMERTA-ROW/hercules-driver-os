import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  allSides,
  autoChecks,
  bothSides,
  classify,
  complianceFor,
  daysUntil,
  drivers,
  exportPackage,
  fmtDate,
  kindSpec,
  manifestCsv,
  missingFor,
  mvrDue,
  rollUp,
  seedRecords,
  spokenExpiry,
  statusOf,
  subjectName,
  vehicles,
  type AccountStatus,
  type ApprovalOutcome,
  type Classified,
  type DocKind,
  type DocRecord,
  type DriverRow,
  type ExportScope,
  type Side,
  type SubjectCompliance,
  type SubjectKind,
} from "@/data/compliance";
import {
  fmcsaProvider,
  type ClearinghouseResult,
  type FmcsaAuthority,
  type FmcsaSafety,
  type MvrPull,
} from "@/lib/fmcsa";

/** A broker's standing request to see a carrier's insurance and authority. */
export type VerificationRequest = {
  id: string;
  carrierName: string;
  dot: string;
  requestedBy: string;
  requestedAt: string;
  items: DocKind[];
  note: string;
  state: "open" | "verified" | "failed";
  result?: string;
};


/**
 * THE COMPLIANCE BOT'S STATE
 * ==========================
 * One list of shared records. Both sides read it through `visible()`, filtered
 * by permission — never by copying documents between sides. Approvals, the
 * bulk-import review queue, and exports all act on that same list, so a file
 * dropped in an office folder behaves exactly like one shot on a phone camera:
 * same verification, same expiry tracking, same spoken warnings.
 */

const RECORDS_KEY = "hercules.compliance.records";
const APPROVALS_KEY = "hercules.compliance.approvals";
const REVIEW_KEY = "hercules.compliance.review";
const SPOKEN_KEY = "hercules.compliance.spoken";

export type ReviewItem = Classified & {
  id: string;
  /** Why it stopped here: unclear type, or no subject match. */
  problem: "kind" | "subject";
};

export type ImportOutcome = {
  filed: DocRecord[];
  review: ReviewItem[];
};

type Ctx = {
  ready: boolean;
  /** Every shared record, unfiltered — use `visible` for a side's view. */
  records: DocRecord[];
  visible: (side: Side) => DocRecord[];
  forSubject: (kind: SubjectKind, id: string) => DocRecord[];
  missing: (kind: SubjectKind, id: string) => ReturnType<typeof missingFor>;
  /** Expired plus inside-the-warning-window, across every record on the account. */
  attention: DocRecord[];
  /** One line for HERCULES to speak, or null when nothing is outstanding. */
  takeWarning: () => string | null;
  /** Manual single upload, from the driver's camera or the company's desk. */
  fileOne: (input: {
    kind: DocKind;
    subjectKind: SubjectKind;
    subjectId: string;
    fileName: string;
    source: DocRecord["source"];
    uploadedBy: string;
  }) => DocRecord;
  /** Folder or batch drop — classify, read, match, file, or send to review. */
  importBatch: (fileNames: string[], uploadedBy: string) => ImportOutcome;
  review: ReviewItem[];
  resolveReview: (
    id: string,
    fix: { kind: DocKind; subjectKind: SubjectKind; subjectId: string },
    uploadedBy: string,
  ) => void;
  discardReview: (id: string) => void;
  /** Approval queue on the broker / ZEUS admin side. */
  approvals: Record<string, ApprovalOutcome>;
  approve: (driverId: string, by: string) => void;
  reject: (driverId: string, reason: string, by: string) => void;
  requestDoc: (driverId: string, kind: DocKind, note: string, by: string) => void;
  pendingDrivers: (companyCode?: string | null) => DriverRow[];
  /** Share one record out to a broker without duplicating it. */
  shareWithBroker: (recordId: string) => void;
  exportSet: (scope: ExportScope) => { fileName: string; count: number; pages: number; csv: string };

  /* ---- THE SINGLE STATUS INDICATOR, ONE BOT PER ACCOUNT ---- */
  /** Compliance for one driver or one vehicle: missing, expired, coming due. */
  subjectStatus: (kind: SubjectKind, id: string) => SubjectCompliance;
  /** The driver's own account rolled into one light. */
  myStatus: { status: AccountStatus; parts: SubjectCompliance[] };
  /** Every driver and vehicle under a carrier, for the roster view. */
  roster: (companyCode?: string | null) => {
    status: AccountStatus;
    drivers: SubjectCompliance[];
    vehicles: SubjectCompliance[];
  };
  /** Where the next scheduled MVR pull stands for a driver. */
  mvrSchedule: (driverId: string) => ReturnType<typeof mvrDue>;

  /* ---- FMCSA SERVICE LAYER (mocked, real seam) ---- */
  fmcsaName: string;
  fmcsaLive: boolean;
  authority: Record<string, FmcsaAuthority>;
  safety: Record<string, FmcsaSafety>;
  clearinghouse: Record<string, ClearinghouseResult>;
  checkAuthority: (dot: string) => Promise<FmcsaAuthority>;
  checkSafety: (dot: string) => Promise<FmcsaSafety>;
  runClearinghouse: (driverId: string, queryType: "limited" | "full", by: string) => Promise<ClearinghouseResult>;
  refreshMvr: (driverId: string, by: string) => Promise<MvrPull>;

  /* ---- BROKER VERIFICATION ---- */
  verifications: VerificationRequest[];
  requestVerification: (input: {
    carrierName: string;
    dot: string;
    items: DocKind[];
    note: string;
    requestedBy: string;
  }) => VerificationRequest;
  runVerification: (id: string) => Promise<VerificationRequest>;
};

const ComplianceContext = createContext<Ctx | null>(null);

function seedApprovals(): Record<string, ApprovalOutcome> {
  const out: Record<string, ApprovalOutcome> = {};
  for (const d of drivers) {
    out[d.id] =
      d.stage === "approved"
        ? { state: "approved", at: d.hiredOn ?? "on file", by: "Onboarding" }
        : { state: "pending" };
  }
  return out;
}

export function ComplianceProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<DocRecord[]>(seedRecords);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [approvals, setApprovals] = useState<Record<string, ApprovalOutcome>>(seedApprovals);
  const [spoken, setSpoken] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [authority, setAuthority] = useState<Record<string, FmcsaAuthority>>({});
  const [safety, setSafety] = useState<Record<string, FmcsaSafety>>({});
  const [clearinghouse, setClearinghouse] = useState<Record<string, ClearinghouseResult>>({});
  const seq = useRef(3000);
  const fmcsa = useRef(fmcsaProvider());

  useEffect(() => {
    try {
      const r = localStorage.getItem(RECORDS_KEY);
      if (r) setRecords(JSON.parse(r) as DocRecord[]);
      const q = localStorage.getItem(REVIEW_KEY);
      if (q) setReview(JSON.parse(q) as ReviewItem[]);
      const a = localStorage.getItem(APPROVALS_KEY);
      if (a) setApprovals(JSON.parse(a) as Record<string, ApprovalOutcome>);
      const s = localStorage.getItem(SPOKEN_KEY);
      if (s) setSpoken(JSON.parse(s) as string[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const saveRecords = useCallback((next: DocRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const saveReview = useCallback((next: ReviewItem[]) => {
    setReview(next);
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const saveApprovals = useCallback((next: Record<string, ApprovalOutcome>) => {
    setApprovals(next);
    try {
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const stamp = () =>
    new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const nextId = () => `CD-${++seq.current}`;

  const value = useMemo<Ctx>(() => {
    const recordsFor = (kind: SubjectKind, id: string) =>
      records.filter((r) => r.subjectKind === kind && r.subjectId === id);

    /* Everything on the driver's own account that is expired or coming due. */
    const mine = records.filter(
      (r) => r.subjectId === "DR-114" || r.subjectId === "HERC-114" || r.subjectId === "TRL-9920",
    );
    const attention = mine
      .filter((r) => {
        const s = statusOf(r);
        return s === "expired" || s === "expiring";
      })
      .sort((a, b) => daysUntil(a.expires) - daysUntil(b.expires));

    return {
      ready,
      records,
      review,
      approvals,
      attention,

      /* THE CROSS-SIDE READ: one record, permission-filtered, no copies. */
      visible: (side) => records.filter((r) => r.visibleTo.includes(side)),
      forSubject: recordsFor,
      missing: (kind, id) => missingFor(kind, id, records),

      takeWarning: () => {
        const due = attention.find((r) => !spoken.includes(r.id));
        if (!due) return null;
        const next = [...spoken, due.id];
        setSpoken(next);
        try {
          localStorage.setItem(SPOKEN_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return spokenExpiry(due);
      },

      fileOne: ({ kind, subjectKind, subjectId, fileName, source, uploadedBy }) => {
        const c = classify(fileName || kindSpec(kind).short, records.length);
        const rec: DocRecord = {
          id: nextId(),
          kind,
          subjectKind,
          subjectId,
          fileName: fileName || `${kind}.pdf`,
          pages: 1,
          read: c.read,
          ...(c.expires ? { expires: c.expires } : {}),
          checks: autoChecks({ ...c, kind, subjectKind, subjectId }),
          source,
          uploadedBy,
          uploadedAt: stamp(),
          visibleTo: bothSides,
        };
        saveRecords([rec, ...records]);
        return rec;
      },

      /* BULK IMPORT — classify, read, match, file. Doubtful goes to review. */
      importBatch: (fileNames, uploadedBy) => {
        const filed: DocRecord[] = [];
        const queued: ReviewItem[] = [];

        fileNames.forEach((fileName, i) => {
          const c = classify(fileName, records.length + i);
          if (!c.kind) {
            queued.push({ ...c, id: `RV-${Date.now()}-${i}`, problem: "kind" });
            return;
          }
          if (!c.subjectId || !c.subjectKind || c.confidence < 0.7) {
            queued.push({ ...c, id: `RV-${Date.now()}-${i}`, problem: "subject" });
            return;
          }
          filed.push({
            id: `CD-${++seq.current}`,
            kind: c.kind,
            subjectKind: c.subjectKind,
            subjectId: c.subjectId,
            fileName,
            pages: 1,
            read: c.read,
            ...(c.expires ? { expires: c.expires } : {}),
            checks: autoChecks(c),
            source: "import",
            uploadedBy,
            uploadedAt: stamp(),
            /* Imported the same way: shared to both sides from the moment it lands. */
            visibleTo: bothSides,
          });
        });

        if (filed.length) saveRecords([...filed, ...records]);
        if (queued.length) saveReview([...queued, ...review]);
        return { filed, review: queued };
      },

      resolveReview: (id, fix, uploadedBy) => {
        const item = review.find((r) => r.id === id);
        if (!item) return;
        const rec: DocRecord = {
          id: `CD-${++seq.current}`,
          kind: fix.kind,
          subjectKind: fix.subjectKind,
          subjectId: fix.subjectId,
          fileName: item.fileName,
          pages: 1,
          read: item.read,
          ...(item.expires ? { expires: item.expires } : {}),
          checks: autoChecks({ ...item, ...fix }),
          source: "import",
          uploadedBy,
          uploadedAt: stamp(),
          visibleTo: bothSides,
        };
        saveRecords([rec, ...records]);
        saveReview(review.filter((r) => r.id !== id));
      },

      discardReview: (id) => saveReview(review.filter((r) => r.id !== id)),

      approve: (driverId, by) =>
        saveApprovals({ ...approvals, [driverId]: { state: "approved", at: stamp(), by } }),
      reject: (driverId, reason, by) =>
        saveApprovals({ ...approvals, [driverId]: { state: "rejected", at: stamp(), by, reason } }),
      requestDoc: (driverId, kind, note, by) =>
        saveApprovals({
          ...approvals,
          [driverId]: { state: "requested", at: stamp(), by, kind, note },
        }),

      pendingDrivers: (companyCode) => {
        const waiting = drivers.filter(
          (d) => (approvals[d.id]?.state ?? "pending") !== "approved",
        );
        const mine = companyCode ? waiting.filter((d) => d.companyCode === companyCode) : [];
        /* A carrier sees its own linked drivers; a broker onboarding carriers
           direct, or a fleet with nobody linked yet, sees the open queue. */
        return mine.length ? mine : waiting;
      },

      shareWithBroker: (recordId) =>
        saveRecords(
          records.map((r) => (r.id === recordId ? { ...r, visibleTo: allSides } : r)),
        ),

      exportSet: (scope) => {
        const pkg = exportPackage(scope, records);
        return {
          fileName: pkg.fileName,
          count: pkg.count,
          pages: pkg.pages,
          csv: manifestCsv(pkg.records),
        };
      },

      /* ---- ONE INDICATOR PER ACCOUNT ---- */
      subjectStatus: (kind, id) => complianceFor(kind, id, records),

      myStatus: (() => {
        const parts = [
          complianceFor("driver", "DR-114", records),
          complianceFor("vehicle", "HERC-114", records),
          complianceFor("vehicle", "TRL-9920", records),
        ];
        return { status: rollUp(parts), parts };
      })(),

      roster: (companyCode) => {
        const crew = companyCode
          ? drivers.filter((d) => d.companyCode === companyCode)
          : drivers.filter((d) => d.companyCode);
        const fleet = companyCode
          ? vehicles.filter((v) => v.companyCode === companyCode)
          : vehicles.filter((v) => v.companyCode);
        const driverParts = (crew.length ? crew : drivers).map((d) =>
          complianceFor("driver", d.id, records),
        );
        const vehicleParts = (fleet.length ? fleet : vehicles).map((v) =>
          complianceFor("vehicle", v.id, records),
        );
        return {
          status: rollUp([...driverParts, ...vehicleParts]),
          drivers: driverParts,
          vehicles: vehicleParts,
        };
      },

      mvrSchedule: (driverId) => mvrDue(records, driverId),

      /* ---- FMCSA THROUGH THE SERVICE LAYER ---- */
      fmcsaName: fmcsa.current.name,
      fmcsaLive: fmcsa.current.live,
      authority,
      safety,
      clearinghouse,

      checkAuthority: async (dot) => {
        const res = await fmcsa.current.authority(dot);
        setAuthority((prev) => ({ ...prev, [dot]: res }));
        return res;
      },

      checkSafety: async (dot) => {
        const res = await fmcsa.current.safety(dot);
        setSafety((prev) => ({ ...prev, [dot]: res }));
        return res;
      },

      /* A Clearinghouse query files as a real, expiring document like any other. */
      runClearinghouse: async (driverId, queryType, by) => {
        const driver = drivers.find((d) => d.id === driverId);
        const res = await fmcsa.current.clearinghouse({
          driverName: driver?.name ?? driverId,
          cdlNumber: `${driver?.cdlState ?? "TX"}-${driverId.replace(/\D/g, "")}`,
          cdlState: driver?.cdlState ?? "TX",
          queryType,
        });
        setClearinghouse((prev) => ({ ...prev, [driverId]: res }));
        const rec: DocRecord = {
          id: nextId(),
          kind: "clearinghouse",
          subjectKind: "driver",
          subjectId: driverId,
          fileName: `clearinghouse-${queryType}-query.pdf`,
          pages: 1,
          read: {
            "Query type": queryType === "limited" ? "Limited annual query" : "Full query",
            Status: res.status === "prohibited" ? "PROHIBITED" : "No prohibitions on record",
            "Query date": fmtDate(res.queriedAt),
            "Valid through": fmtDate(res.validThrough),
          },
          issued: res.queriedAt,
          expires: res.validThrough,
          checks: [
            { label: "Query returned by FMCSA", pass: true },
            { label: "Driver not prohibited", pass: res.status === "not prohibited" },
          ],
          source: "company",
          uploadedBy: by,
          uploadedAt: stamp(),
          visibleTo: bothSides,
        };
        saveRecords([rec, ...records.filter((r) => !(r.kind === "clearinghouse" && r.subjectId === driverId))]);
        return res;
      },

      /* MVRs are pulled on the schedule, not on the driver's memory. */
      refreshMvr: async (driverId, by) => {
        const driver = drivers.find((d) => d.id === driverId);
        const res = await fmcsa.current.mvr({ driverId, state: driver?.cdlState ?? "TX" });
        const rec: DocRecord = {
          id: nextId(),
          kind: "mvr",
          subjectKind: "driver",
          subjectId: driverId,
          fileName: `mvr-${res.state.toLowerCase()}-${res.pulledAt}.pdf`,
          pages: 2,
          read: {
            State: res.state,
            "Pull date": fmtDate(res.pulledAt),
            Violations: res.violations,
            "Valid through": fmtDate(res.validThrough),
          },
          issued: res.pulledAt,
          expires: res.validThrough,
          checks: [
            { label: "Pulled inside the refresh window", pass: true },
            { label: "No disqualifying violations", pass: res.status === "clean" },
          ],
          source: "company",
          uploadedBy: by,
          uploadedAt: stamp(),
          visibleTo: bothSides,
        };
        saveRecords([rec, ...records.filter((r) => !(r.kind === "mvr" && r.subjectId === driverId))]);
        return res;
      },

      /* ---- BROKER VERIFICATION: request, then verify against FMCSA + the vault ---- */
      verifications,

      requestVerification: ({ carrierName, dot, items, note, requestedBy }) => {
        const req: VerificationRequest = {
          id: `VR-${++seq.current}`,
          carrierName,
          dot,
          items,
          note,
          requestedBy,
          requestedAt: stamp(),
          state: "open",
        };
        saveVerifications([req, ...verifications]);
        return req;
      },

      runVerification: async (id) => {
        const req = verifications.find((v) => v.id === id);
        if (!req) throw new Error("No such verification request");
        const auth = await fmcsa.current.authority(req.dot);
        setAuthority((prev) => ({ ...prev, [req.dot]: auth }));
        const shared = records.filter((r) => r.visibleTo.includes("broker"));
        const missingItems = req.items.filter(
          (k) => !shared.some((r) => r.kind === k && statusOf(r) !== "expired"),
        );
        const authOk = auth.status === "active";
        const next: VerificationRequest = {
          ...req,
          state: authOk && !missingItems.length ? "verified" : "failed",
          result:
            authOk && !missingItems.length
              ? `Authority ${auth.mc ?? auth.dot} active, insurance on file with ${auth.insuranceOnFile[0]?.carrier ?? "the carrier"}, and every requested document current in the vault.`
              : [
                  authOk ? null : `Authority reads ${auth.status} on FMCSA.`,
                  missingItems.length
                    ? `Not current or not shared: ${missingItems.map((k) => kindSpec(k).short).join(", ")}.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" "),
        };
        saveVerifications(verifications.map((v) => (v.id === id ? next : v)));
        return next;
      },
    };
  }, [
    records,
    review,
    approvals,
    spoken,
    ready,
    verifications,
    authority,
    safety,
    clearinghouse,
    saveRecords,
    saveReview,
    saveApprovals,
    saveVerifications,
  ]);

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
}

export function useCompliance(): Ctx {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error("useCompliance must be used inside ComplianceProvider");
  return ctx;
}

/** Convenience: subjects the company side can act on. */
export const complianceSubjects = { drivers, vehicles, subjectName };
