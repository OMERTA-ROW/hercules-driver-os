import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { money, rpc, useFreight, useLoads, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { FreightRoute } from "@/components/freight/FreightWorkspace";
import { Badge, Card, Empty, FButton, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/freight-control")({
  head: () => ({ meta: [{ title: "Automation & approvals — Hercules Freight OS" }, { name: "description", content: "Assistive reminders and human approvals." }] }),
  component: Page,
});

const RULES: Record<string, { name: string; trigger: string; action: string }> = {
  missing_fields: { name: "Missing load fields", trigger: "Load pickup within 3 days", action: "Suggest filling required fields" },
  doc_expiry: { name: "Expiring documents", trigger: "Driver or equipment document expires within 30 days", action: "Create a follow-up task" },
  late_risk: { name: "Late risk", trigger: "Delivery due within 2 hours and not arrived", action: "Alert dispatch" },
  appointment_soon: { name: "Appointment reminder", trigger: "Pickup within 2 hours and driver not en route", action: "Remind dispatch" },
  missing_pod: { name: "Missing POD", trigger: "Arrived at delivery with no POD", action: "Ask driver to upload POD" },
  driver_suggestion: { name: "Driver suggestion", trigger: "Unassigned load with a free, compliant driver", action: "Suggest a driver (dispatcher assigns)" },
};
const ACTION: Record<string, string> = { reassign: "Reassign driver/equipment", rate_change: "Rate change", carrier_booking: "Carrier booking", customer_message: "Customer message", invoice: "Invoice approval", settlement: "Settlement approval", payment: "Payment record", compliance: "Compliance change", cancel_load: "Cancel load" };

type Rule = { id: string; kind: string; enabled: boolean; approval_required: boolean };
type Run = { id: string; title: string; why: string; status: string; load_id: string | null; created_at: string; error: string | null; rule_id: string | null };
type Appr = { id: string; action: string; status: string; reason: string | null; why: string | null; payload: Record<string, unknown>; load_id: string | null; requested_by: string; created_at: string; error: string | null; target_version: number | null };

function Page() { return <FreightRoute title="Approvals"><Automation /></FreightRoute>; }

function Automation() {
  const { company, has, userId } = useFreight();
  const rules = useRows<Rule>("freight_automation_rules", company?.id);
  const runs = useRows<Run>("freight_automation_runs", company?.id);
  const appr = useRows<Appr>("freight_approvals", company?.id);
  const loads = useLoads(company?.id);
  const inv = useInvalidate();
  const [busy, setBusy] = useState(false);
  if (rules.isLoading) return <Loading />;
  const admin = has("admin");
  const ref = (id: string | null) => loads.data?.find((l) => l.id === id);

  const scan = async () => {
    setBusy(true);
    const r = await rpc("freight_automation_scan", { _company: company!.id });
    setBusy(false);
    r.ok ? toast.success(`Scan finished: ${String(r["created"] ?? 0)} new suggestions.`) : toast.error(r.message);
    void inv();
  };
  const toggle = async (kind: string, enabled: boolean) => {
    const r = await rpc("freight_rule_set", { _company: company!.id, _kind: kind, _enabled: enabled });
    r.ok ? void inv() : toast.error(r.message);
  };
  const review = async (id: string, status: string) => {
    const r = await rpc("freight_run_review", { _run: id, _status: status });
    r.ok ? void inv() : toast.error(r.message);
  };
  const decide = async (a: Appr, approve: boolean) => {
    const note = approve ? null : window.prompt("Reason for rejecting");
    if (!approve && !note) return;
    const r = await rpc("freight_approval_decide", { _approval: a.id, _approve: approve, _note: note });
    r.ok ? toast.success(approve ? "Approved and carried out." : "Rejected.") : toast.error(r.message);
    void inv();
  };

  const pending = (appr.data ?? []).filter((a) => a.status === "pending");
  const decided = (appr.data ?? []).filter((a) => a.status !== "pending").slice(0, 20);
  const open = (runs.data ?? []).filter((r) => r.status === "open");

  return (
    <>
      <PageHeader title="Automation & approvals" sub="Automation only suggests. Rate, assignment, booking, customer, invoice, settlement, payment and compliance changes always wait for a person." actions={<FButton busy={busy} onClick={scan}>Run checks now</FButton>} />
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Waiting for approval ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((a) => {
              const mine = a.requested_by === userId;
              const canDecide = !mine && (admin || (has("finance") && ["invoice", "settlement", "payment"].includes(a.action)));
              return (
                <Card key={a.id}>
                  <div className="flex justify-between"><p className="font-semibold">{ACTION[a.action]}</p><Badge tone="warn">Pending</Badge></div>
                  {a.load_id && <p className="text-sm">Load <Link to="/freight-loads/$id" params={{ id: a.load_id }} className="text-primary underline">{ref(a.load_id)?.reference ?? "open"}</Link>{a.target_version != null && ` · version ${a.target_version}`}</p>}
                  {a.reason && <p className="mt-1 text-sm">{a.reason}</p>}
                  {typeof a.payload["customer_rate_cents"] === "number" && <p className="text-sm">New rate {money(a.payload["customer_rate_cents"] as number)}</p>}
                  {typeof a.payload["body"] === "string" && <p className="mt-1 rounded bg-surface p-2 text-sm">“{a.payload["body"] as string}”</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Why: {a.why ?? "—"} · {when(a.created_at)}</p>
                  {mine && <p className="mt-2 text-xs text-muted-foreground">You requested this, so someone else must approve it.</p>}
                  {canDecide && <div className="mt-3 flex gap-2"><FButton size="sm" variant="success" onClick={() => decide(a, true)}>Approve</FButton><FButton size="sm" variant="outline" onClick={() => decide(a, false)}>Reject</FButton></div>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Suggestions ({open.length})</h2>
        {open.length === 0 ? <Empty icon={Sparkles} title="No open suggestions" body="Run checks to look for missing fields, expiring documents, late risk and missing PODs." /> : (
          <ul className="space-y-2">
            {open.map((r) => (
              <li key={r.id} className="hfo-card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground"><strong>Why this was suggested:</strong> {r.why}</p>
                  {r.load_id && <Link to="/freight-loads/$id" params={{ id: r.load_id }} className="text-sm text-primary underline">Open load {ref(r.load_id)?.reference}</Link>}
                </div>
                <FButton size="sm" variant="outline" onClick={() => review(r.id, "done")}>Mark done</FButton>
                <FButton size="sm" variant="ghost" onClick={() => review(r.id, "dismissed")}>Dismiss</FButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Rules</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(RULES).map(([kind, d]) => {
            const r = rules.data?.find((x) => x.kind === kind);
            const on = r?.enabled ?? false;
            return (
              <Card key={kind}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{d.name}</p><p className="text-xs text-muted-foreground">Owner: company admins</p></div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-primary" checked={on} disabled={!admin} onChange={(e) => toggle(kind, e.target.checked)} aria-label={`${d.name} enabled`} />
                    {on ? "On" : "Off"}
                  </label>
                </div>
                <dl className="mt-3 grid gap-1 text-sm"><div><dt className="inline text-muted-foreground">When: </dt><dd className="inline">{d.trigger}</dd></div><div><dt className="inline text-muted-foreground">Does: </dt><dd className="inline">{d.action}</dd></div><div><dt className="inline text-muted-foreground">Approval: </dt><dd className="inline">Suggestions only — never changes a load by itself</dd></div></dl>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        <ul className="space-y-1 text-sm">
          {decided.length === 0 && (runs.data ?? []).filter((r) => r.status !== "open").length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
          {decided.map((a) => <li key={a.id}><Badge tone={statusTone(a.status)}>{a.status}</Badge> {ACTION[a.action]} · {when(a.created_at)}{a.error ? ` · ${a.error}` : ""}</li>)}
          {(runs.data ?? []).filter((r) => r.status !== "open").slice(0, 20).map((r) => (
            <li key={r.id} className="flex items-center gap-2"><Badge tone={statusTone(r.status)}>{r.status}</Badge> {r.title}{r.error ? ` · ${r.error}` : ""}<FButton size="sm" variant="ghost" onClick={() => review(r.id, "open")}>Undo</FButton></li>
          ))}
        </ul>
      </section>
    </>
  );
}
