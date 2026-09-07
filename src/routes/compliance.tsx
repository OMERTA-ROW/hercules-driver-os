import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldCheck,
  Upload,
  FolderInput,
  Download,
  AlertTriangle,
  Check,
  X,
  Mail,
  FileWarning,
  Eye,
  Share2,
  Users,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useCompliance } from "@/lib/compliance";
import {
  daysUntil,
  docKinds,
  drivers,
  fmtDate,
  kindSpec,
  rejectReasons,
  sampleBatch,
  statusOf,
  subjectName,
  vehicles,
  type DocKind,
  type DocRecord,
  type Side,
  type SubjectKind,
} from "@/data/compliance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance Documents — Approval, Bulk Import, Shared Records" },
      {
        name: "description",
        content:
          "HERCULES files, reads and tracks every compliance document — CDL, medical card, insurance, authority, MVR, drug and alcohol, registration, inspections — with broker and fleet approval queues, folder-drop import, and one shared record read by both sides.",
      },
      { property: "og:title", content: "Compliance Documents — HERCULES" },
      {
        property: "og:description",
        content:
          "One shared document record per file, surfaced to whoever has permission. Bulk import classifies and files; anything doubtful goes to a human.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComplianceScreen,
});

type Tab = "mine" | "approvals" | "import" | "export";

function ComplianceScreen() {
  const { account, allows } = useAuth();
  const c = useCompliance();
  const companySide = allows("fleet.onboarding") || allows("fleet.drivers");
  const [tab, setTab] = useState<Tab>(companySide ? "approvals" : "mine");

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "mine", label: "My documents", show: true },
    { id: "approvals", label: "Approval queue", show: companySide },
    { id: "import", label: "Bulk import", show: companySide },
    { id: "export", label: "Export", show: true },
  ];

  return (
    <AppShell
      title="Compliance"
      subtitle="One shared record per document — same set on the driver side and the company side"
    >
      {/* WHAT NEEDS ATTENTION — spoken as well as shown */}
      <AttentionStrip />

      <div className="mb-3 flex flex-wrap gap-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-[52px] rounded-xl border px-4 font-display text-sm uppercase tracking-[0.14em] transition-colors",
                tab === t.id
                  ? "border-primary/60 bg-primary/14 text-primary"
                  : "border-border bg-card/50 hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "mine" ? <MyDocuments /> : null}
      {tab === "approvals" && companySide ? <ApprovalQueue /> : null}
      {tab === "import" && companySide ? <BulkImport /> : null}
      {tab === "export" ? <ExportPanel /> : null}

      {!companySide ? (
        <Panel className="mt-3">
          <PanelTitle right={<Pill tone="info">Shared record</Pill>}>
            Who else sees these
          </PanelTitle>
          <p className="text-sm text-muted-foreground">
            Everything you send in is stored once. Your carrier and any broker you allow read that
            same record — nobody keeps a second copy that can drift out of date.
            {account?.company ? ` Linked to ${account.company.name}.` : " You are solo, so nothing goes to a carrier."}
          </p>
        </Panel>
      ) : null}
    </AppShell>
  );
}

/* -------------------------------------------------------------- ATTENTION */

function AttentionStrip() {
  const { attention } = useCompliance();
  if (!attention.length) return null;

  return (
    <div className="mb-3 space-y-2">
      {attention.map((r) => {
        const d = daysUntil(r.expires);
        const gone = d < 0;
        return (
          <div
            key={r.id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border p-3",
              gone ? "border-destructive/60 bg-destructive/12" : "border-warn/50 bg-warn/10",
            )}
          >
            <AlertTriangle className={cn("h-6 w-6 shrink-0", gone ? "text-destructive" : "text-warn")} />
            <span className="min-w-0">
              <span className="block font-display text-base uppercase tracking-[0.1em]">
                {kindSpec(r.kind).label} · {subjectName(r.subjectKind, r.subjectId)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {gone
                  ? `Expired ${Math.abs(d)} days ago — ${fmtDate(r.expires)}. Out-of-service risk at a scale.`
                  : `Expires in ${d} days — ${fmtDate(r.expires)}.`}
              </span>
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Volume2 className="h-4 w-4 text-primary" /> Said out loud too
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- MY DOCUMENTS */

function MyDocuments() {
  const { account } = useAuth();
  const c = useCompliance();
  const [kind, setKind] = useState<DocKind>("medical");
  const spec = kindSpec(kind);
  const subjectId = spec.subject === "driver" ? "DR-114" : "HERC-114";

  const mine = useMemo(
    () =>
      c.records.filter(
        (r) => r.subjectId === "DR-114" || r.subjectId === "HERC-114" || r.subjectId === "TRL-9920",
      ),
    [c.records],
  );

  const missingDriver = c.missing("driver", "DR-114");
  const missingTruck = c.missing("vehicle", "HERC-114");

  return (
    <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
      <Panel>
        <PanelTitle right={<Pill tone="primary">{mine.length} on file</Pill>}>
          Your document set
        </PanelTitle>
        <div className="space-y-2">
          {mine.map((r) => (
            <RecordRow key={r.id} rec={r} onShare={() => c.shareWithBroker(r.id)} />
          ))}
        </div>
        {missingDriver.length || missingTruck.length ? (
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn/8 p-3">
            <Label>Still missing</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {[...missingDriver, ...missingTruck].map((k) => k.label).join(" · ")}
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel>
        <PanelTitle right={<Pill tone="info">Add one</Pill>}>Send in a document</PanelTitle>
        <Label>What is it</Label>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {docKinds.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cn(
                "min-h-[56px] rounded-lg border p-2.5 text-left text-sm transition-colors",
                kind === k.id
                  ? "border-primary/60 bg-primary/12 text-primary"
                  : "border-border bg-card/50 hover:bg-accent",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          I read {spec.fields.join(", ").toLowerCase()} off the face of it, file it against{" "}
          {subjectName(spec.subject, subjectId)}, and start watching the date
          {spec.expires ? ` from ${spec.warnDays} days out` : ""}.
        </p>
        <Button
          size="lg"
          className="mt-3 w-full gap-2"
          onClick={() => {
            const rec = c.fileOne({
              kind,
              subjectKind: spec.subject,
              subjectId,
              fileName: `${spec.short.toLowerCase().replace(/[^a-z]/g, "-")}-${Date.now()}.pdf`,
              source: "driver",
              uploadedBy: account?.name ?? "Vinson Bass",
            });
            toast.success(`${spec.label} filed`, {
              description: rec.expires
                ? `Read and verified. Watching ${fmtDate(rec.expires)}.`
                : "Read and verified.",
            });
          }}
        >
          <Upload className="h-4 w-4" /> File this document
        </Button>
        <div className="mt-3">
          <DriverApprovedNote>
            I file and I warn. I do not send anything to a broker or a carrier until you say so.
          </DriverApprovedNote>
        </div>
      </Panel>
    </div>
  );
}

function RecordRow({ rec, onShare }: { rec: DocRecord; onShare?: () => void }) {
  const [open, setOpen] = useState(false);
  const status = statusOf(rec);
  const spec = kindSpec(rec.kind);
  const failed = rec.checks.filter((k) => !k.pass);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm uppercase tracking-[0.12em]">
            {spec.label}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {subjectName(rec.subjectKind, rec.subjectId)} · {rec.fileName} ·{" "}
            {rec.source === "import" ? "folder import" : rec.source === "company" ? "company" : "driver"} ·{" "}
            {rec.uploadedAt}
          </span>
        </span>
        <Pill tone={status === "expired" ? "alert" : status === "expiring" ? "warn" : "go"}>
          {status === "expired"
            ? "Expired"
            : status === "expiring"
              ? `${daysUntil(rec.expires)} days`
              : spec.expires
                ? fmtDate(rec.expires)
                : "No expiry"}
        </Pill>
        <Button size="lg" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>What I read off it</Label>
            <ul className="mt-1 space-y-1 text-xs">
              {Object.entries(rec.read).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label>What I verified</Label>
            <ul className="mt-1 space-y-1 text-xs">
              {rec.checks.map((k) => (
                <li key={k.label} className="flex items-start gap-1.5">
                  {k.pass ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go" />
                  ) : (
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <span className={k.pass ? "" : "text-destructive"}>{k.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
              Visible to {rec.visibleTo.map(sideLabel).join(" · ")}
            </p>
            {onShare && !rec.visibleTo.includes("broker") ? (
              <Button
                size="lg"
                variant="outline"
                className="mt-2 w-full gap-2"
                onClick={() => {
                  onShare();
                  toast.success("Shared with the broker", {
                    description: "Same record, one more reader — no second copy.",
                  });
                }}
              >
                <Share2 className="h-4 w-4" /> Let the broker read this one
              </Button>
            ) : null}
            {failed.length ? (
              <p className="mt-2 text-xs text-destructive">
                {failed.length} thing{failed.length === 1 ? "" : "s"} I could not clear on this one.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sideLabel(s: Side) {
  return s === "hercules" ? "the driver" : s === "zeus" ? "the carrier" : "the broker";
}

/* -------------------------------------------------------------- APPROVALS */

function ApprovalQueue() {
  const { account } = useAuth();
  const c = useCompliance();
  const code = account?.company?.code ?? null;
  const pending = c.pendingDrivers(code);
  const by = account?.company?.name ?? account?.name ?? "Onboarding";

  const [reason, setReason] = useState<Record<string, string>>({});

  if (!pending.length) {
    return (
      <Panel>
        <PanelTitle right={<Pill tone="go">Clear</Pill>}>Approval queue</PanelTitle>
        <p className="text-sm text-muted-foreground">
          Nobody is waiting. New drivers land here the moment they send their first document in.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((d) => {
        const recs = c.forSubject("driver", d.id);
        const missing = c.missing("driver", d.id);
        const outcome = c.approvals[d.id] ?? { state: "pending" as const };
        const blocking = recs.filter((r) => statusOf(r) !== "valid");

        return (
          <Panel key={d.id}>
            <PanelTitle
              right={
                <Pill
                  tone={
                    outcome.state === "rejected"
                      ? "alert"
                      : outcome.state === "requested"
                        ? "warn"
                        : "info"
                  }
                >
                  {outcome.state === "requested"
                    ? "Document requested"
                    : outcome.state === "rejected"
                      ? "Rejected"
                      : "Pending"}
                </Pill>
              }
            >
              <span className="inline-flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> {d.name}
              </span>
            </PanelTitle>
            <p className="text-xs text-muted-foreground">
              {d.cdlState} CDL · {d.companyCode ?? "no carrier attached"} · {recs.length} documents
              in · {missing.length} missing
            </p>

            {/* WHAT THEY SENT AND WHAT THE BOT MADE OF IT */}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Submitted</Label>
                {recs.length ? (
                  recs.map((r) => <RecordRow key={r.id} rec={r} />)
                ) : (
                  <p className="text-xs text-muted-foreground">Nothing in yet.</p>
                )}
              </div>
              <div>
                <Label>Missing or expired</Label>
                <ul className="mt-1 space-y-1.5">
                  {blocking.map((r) => (
                    <li key={r.id} className="flex items-start gap-1.5 text-xs text-destructive">
                      <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {kindSpec(r.kind).label} — {statusOf(r) === "expired" ? "expired" : "expiring"}{" "}
                      {fmtDate(r.expires)}
                    </li>
                  ))}
                  {missing.map((k) => (
                    <li key={k.id} className="flex items-start gap-1.5 text-xs text-warn">
                      <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {k.label} — never sent
                    </li>
                  ))}
                  {!blocking.length && !missing.length ? (
                    <li className="flex items-center gap-1.5 text-xs text-go">
                      <Check className="h-3.5 w-3.5" /> Full set, all current
                    </li>
                  ) : null}
                </ul>

                {/* ASK FOR ONE SPECIFIC THING */}
                <Label className="mt-3 block">Request a specific document</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[...missing, ...blocking.map((r) => kindSpec(r.kind))].slice(0, 6).map((k) => (
                    <Button
                      key={k.id}
                      size="lg"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        c.requestDoc(d.id, k.id, `Send a current ${k.label.toLowerCase()}`, by);
                        toast.success(`Asked ${d.name} for the ${k.short.toLowerCase()}`, {
                          description: "It shows on their side as an outstanding request.",
                        });
                      }}
                    >
                      <Mail className="h-4 w-4" /> {k.short}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* DECIDE */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  c.approve(d.id, by);
                  toast.success(`${d.name} approved and onboarded`, {
                    description: "Their documents stay one shared set across both sides.",
                  });
                }}
              >
                <ShieldCheck className="h-4 w-4" /> Approve and onboard
              </Button>
              <Input
                value={reason[d.id] ?? ""}
                onChange={(e) => setReason((p) => ({ ...p, [d.id]: e.target.value }))}
                aria-label={`Reason for rejecting ${d.name}`}
                placeholder="Reason — required to reject"
                className="h-12 max-w-sm text-base"
              />
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const r = (reason[d.id] ?? "").trim();
                  if (!r) {
                    toast.error("Put a reason in — the driver gets told exactly why");
                    return;
                  }
                  c.reject(d.id, r, by);
                  toast.success(`${d.name} rejected`, { description: r });
                }}
              >
                <X className="h-4 w-4" /> Reject with reason
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {rejectReasons.slice(0, 3).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason((p) => ({ ...p, [d.id]: r }))}
                    className="rounded-full border border-border px-2.5 py-1 text-[0.68rem] text-muted-foreground hover:bg-accent"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {outcome.state === "rejected" ? (
              <p className="mt-2 text-xs text-destructive">
                Rejected {outcome.at} by {outcome.by} — “{outcome.reason}”
              </p>
            ) : null}
            {outcome.state === "requested" ? (
              <p className="mt-2 text-xs text-warn">
                {kindSpec(outcome.kind).label} requested {outcome.at} — {outcome.note}
              </p>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- BULK IMPORT */

function BulkImport() {
  const { account } = useAuth();
  const c = useCompliance();
  const [lastFiled, setLastFiled] = useState<DocRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const by = account?.company?.name ?? account?.name ?? "Office import";

  const run = (names: string[]) => {
    if (!names.length) return;
    const out = c.importBatch(names, by);
    setLastFiled(out.filed);
    toast.success(`${out.filed.length} of ${names.length} filed automatically`, {
      description: out.review.length
        ? `${out.review.length} need a human — they are in the review queue.`
        : "Everything classified, matched and date-tracked.",
    });
  };

  return (
    <div className="space-y-3">
      <Panel>
        <PanelTitle right={<Pill tone="info">Folder drop</Pill>}>
          Drop in what you already hold
        </PanelTitle>
        <p className="text-sm text-muted-foreground">
          Point it at a whole folder or a pile of files. Each one gets looked at: what kind of
          document it is, the fields off its face, which driver or truck it belongs to. Anything I am
          not sure about I do not guess on — it goes to review.
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            run(names);
            e.target.value = "";
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="lg" className="gap-2" onClick={() => inputRef.current?.click()}>
            <FolderInput className="h-4 w-4" /> Choose files or a folder
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => run(sampleBatch)}>
            <Upload className="h-4 w-4" /> Run the {sampleBatch.length}-file sample batch
          </Button>
        </div>

        {lastFiled.length ? (
          <div className="mt-3 space-y-2">
            <Label>Filed on the last run</Label>
            {lastFiled.map((r) => (
              <RecordRow key={r.id} rec={r} />
            ))}
            <p className="text-xs text-muted-foreground">
              These are tracked for expiry and spoken about exactly like a camera upload.
            </p>
          </div>
        ) : null}
      </Panel>

      <ReviewQueue />
    </div>
  );
}

function ReviewQueue() {
  const { account } = useAuth();
  const c = useCompliance();
  const [fix, setFix] = useState<Record<string, { kind?: DocKind; subjectId?: string }>>({});
  const by = account?.company?.name ?? account?.name ?? "Office import";

  return (
    <Panel>
      <PanelTitle
        right={<Pill tone={c.review.length ? "warn" : "go"}>{c.review.length} to resolve</Pill>}
      >
        Review queue — the ones I would not guess on
      </PanelTitle>

      {!c.review.length ? (
        <p className="text-sm text-muted-foreground">
          Nothing waiting. Files I cannot confidently classify or match land here instead of being
          filed against the wrong driver.
        </p>
      ) : (
        <div className="space-y-2">
          {c.review.map((item) => {
            const chosenKind = fix[item.id]?.kind ?? item.kind ?? undefined;
            const spec = chosenKind ? kindSpec(chosenKind) : null;
            const subjectKind: SubjectKind = spec?.subject ?? "driver";
            const options = subjectKind === "driver" ? drivers : vehicles;
            const chosenSubject = fix[item.id]?.subjectId ?? item.subjectId ?? undefined;

            return (
              <div key={item.id} className="rounded-xl border border-warn/40 bg-warn/8 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileWarning className="h-5 w-5 shrink-0 text-warn" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm uppercase tracking-[0.1em]">
                      {item.fileName}
                    </span>
                    <span className="block text-xs text-muted-foreground">{item.reason}</span>
                  </span>
                  <Pill tone="warn">{Math.round(item.confidence * 100)}% sure</Pill>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <Label>What kind of document is it</Label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {docKinds.map((k) => (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() =>
                            setFix((p) => ({ ...p, [item.id]: { ...p[item.id], kind: k.id } }))
                          }
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs transition-colors",
                            chosenKind === k.id
                              ? "border-primary/60 bg-primary/14 text-primary"
                              : "border-border hover:bg-accent",
                          )}
                        >
                          {k.short}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Whose is it</Label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {options.map((o) => {
                        const id = o.id;
                        const label = "name" in o ? o.name : o.label;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setFix((p) => ({ ...p, [item.id]: { ...p[item.id], subjectId: id } }))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition-colors",
                              chosenSubject === id
                                ? "border-primary/60 bg-primary/14 text-primary"
                                : "border-border hover:bg-accent",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => {
                      if (!chosenKind || !chosenSubject) {
                        toast.error("Pick the document type and who it belongs to");
                        return;
                      }
                      c.resolveReview(
                        item.id,
                        { kind: chosenKind, subjectKind, subjectId: chosenSubject },
                        by,
                      );
                      toast.success("Filed", {
                        description: `${kindSpec(chosenKind).label} for ${subjectName(subjectKind, chosenSubject)} — now tracked for expiry.`,
                      });
                    }}
                  >
                    <Check className="h-4 w-4" /> File it here
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    onClick={() => c.discardReview(item.id)}
                  >
                    <X className="h-4 w-4" /> Not a compliance document
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------- EXPORT */

function ExportPanel() {
  const { allows } = useAuth();
  const c = useCompliance();
  const [last, setLast] = useState<{ fileName: string; count: number; pages: number } | null>(null);
  const fleetSide = allows("fleet.trucks");

  const pull = (scope: Parameters<typeof c.exportSet>[0], label: string) => {
    const pkg = c.exportSet(scope);
    setLast(pkg);
    try {
      const blob = new Blob([pkg.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pkg.fileName.replace(".zip", "-manifest.csv");
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* download unavailable in this environment */
    }
    toast.success(`${label} pulled`, {
      description: `${pkg.count} documents, ${pkg.pages} pages. Manifest downloaded.`,
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <PanelTitle right={<Pill tone="primary">Package</Pill>}>Pull a document set</PanelTitle>
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full justify-start gap-2"
            onClick={() => pull({ kind: "driver", id: "DR-114" }, "Your driver set")}
          >
            <Download className="h-4 w-4" /> Everything for one driver
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => pull({ kind: "vehicle", id: "HERC-114" }, "Unit 4471 set")}
          >
            <Download className="h-4 w-4" /> Everything for one truck
          </Button>
          {fleetSide ? (
            <Button
              size="lg"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => pull({ kind: "fleet", id: "all" }, "Whole fleet set")}
            >
              <Download className="h-4 w-4" /> The whole fleet, every driver and truck
            </Button>
          ) : null}
        </div>
        {last ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Last pull: {last.fileName} — {last.count} documents, {last.pages} pages, with a manifest
            listing every expiry date.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <PanelTitle right={<Pill tone="info">One set</Pill>}>Both sides, same record</PanelTitle>
        <div className="space-y-2">
          {(["hercules", "zeus", "broker"] as Side[]).map((s) => (
            <div
              key={s}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 p-2.5"
            >
              <span className="text-sm capitalize">
                {s === "hercules"
                  ? "HERCULES driver side"
                  : s === "zeus"
                    ? "ZEUS company side"
                    : "Broker portal"}
              </span>
              <Pill tone="go">{c.visible(s).length} readable</Pill>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          These are counts of the same records seen through different permissions — not copies. Fix a
          date once and everyone is looking at the fix.
        </p>
      </Panel>
    </div>
  );
}
