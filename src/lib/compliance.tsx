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
  daysUntil,
  drivers,
  exportPackage,
  kindSpec,
  manifestCsv,
  missingFor,
  seedRecords,
  spokenExpiry,
  statusOf,
  subjectName,
  vehicles,
  type ApprovalOutcome,
  type Classified,
  type DocKind,
  type DocRecord,
  type DriverRow,
  type ExportScope,
  type Side,
  type SubjectKind,
} from "@/data/compliance";

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
  const seq = useRef(3000);

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

      pendingDrivers: (companyCode) =>
        drivers.filter(
          (d) =>
            (approvals[d.id]?.state ?? "pending") !== "approved" &&
            (!companyCode || d.companyCode === companyCode),
        ),

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
    };
  }, [records, review, approvals, spoken, ready, saveRecords, saveReview, saveApprovals]);

  return <ComplianceContext.Provider value={value}>{children}</ComplianceContext.Provider>;
}

export function useCompliance(): Ctx {
  const ctx = useContext(ComplianceContext);
  if (!ctx) throw new Error("useCompliance must be used inside ComplianceProvider");
  return ctx;
}

/** Convenience: subjects the company side can act on. */
export const complianceSubjects = { drivers, vehicles, subjectName };
