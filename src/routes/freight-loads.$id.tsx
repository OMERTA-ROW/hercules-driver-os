import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { OP_LABEL, OP_STEPS, STATUS_LABEL, money, rpc, useFreight, useLoads, useTeam, when, type LoadRow } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { LoadForm } from "@/components/freight/LoadForm";
import { LoadDocs } from "@/components/freight/LoadDocs";
import { Badge, Card, ErrorNote, Field, FButton, FInput, FSelect, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/freight-loads/$id")({
  head: () => ({ meta: [{ title: "Load — Hercules Freight OS" }, { name: "description", content: "Load details, assignment, documents and timeline." }] }),
  component: LoadPage,
});

type Ev = { id: string; kind: string; from_value: string | null; to_value: string | null; reason: string | null; created_at: string; version: number };
type Fin = { load_id: string; customer_rate_cents: number | null; carrier_pay_cents: number | null; driver_pay_cents: number | null; rate_confirmed: boolean };

function LoadPage() {
  const { id } = Route.useParams();
  const { company, has, userId } = useFreight();
  const loads = useLoads(company?.id);
  const l = loads.data?.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const inv = useInvalidate();
  if (loads.isLoading) return <Loading />;
  if (!l) return <ErrorNote>This load doesn't exist or isn't visible to your role. <Link to="/loads" className="underline">Back to loads</Link></ErrorNote>;
  const mgr = has("admin", "dispatcher", "broker");
  const isDriver = l.driver_id === userId;

  return (
    <>
      <PageHeader
        title={l.reference}
        sub={`${l.origin ?? "Origin not set"} → ${l.destination ?? "Destination not set"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(l.status)}>{STATUS_LABEL[l.status]}</Badge>
            {l.op_status && <Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status]}</Badge>}
            {mgr && !["delivered", "cancelled"].includes(l.status) && <FButton variant="outline" size="sm" onClick={() => setEdit(!edit)}>{edit ? "Close editor" : "Edit"}</FButton>}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {edit ? (
            <Card><LoadForm load={l} onSaved={() => { setEdit(false); void inv(); toast.success("Load saved."); }} /></Card>
          ) : (
            <Card>
              <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                {[["Pickup", when(l.pickup_at)], ["Delivery", when(l.delivery_at)], ["Equipment", l.equipment_type], ["Commodity", l.commodity], ["Weight", l.weight_lb ? `${l.weight_lb.toLocaleString()} lb` : null], ["Contact", [l.contact_name, l.contact_phone].filter(Boolean).join(" · ")]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-1 font-medium">{v || "—"}</dd></div>
                ))}
              </dl>
              {l.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{l.notes}</p>}
              {l.delivered_override_reason && <p className="mt-4 text-sm text-warn">Delivered without POD by admin override: {l.delivered_override_reason}</p>}
            </Card>
          )}
          {mgr && <Commercial l={l} />}
          {(has("admin", "dispatcher") || isDriver) && <Status l={l} admin={has("admin")} mgr={has("admin", "dispatcher")} />}
          <Card><h2 className="mb-3 text-lg font-semibold">Documents</h2><LoadDocs companyId={l.company_id} loadId={l.id} canUpload={mgr || isDriver || has("fleet_owner")} /></Card>
        </div>
        <div className="space-y-5">
          {has("admin", "dispatcher") && <Assign l={l} />}
          {has("admin", "broker", "finance", "dispatcher") && <Money l={l} />}
          <Timeline l={l} />
        </div>
      </div>
    </>
  );
}

function Commercial({ l }: { l: LoadRow }) {
  const inv = useInvalidate();
  const [busy, setBusy] = useState<string | null>(null);
  const next: Record<string, string[]> = { draft: ["tendered"], tendered: ["accepted", "countered", "draft"], countered: ["tendered", "accepted"] };
  const go = async (to: string) => {
    setBusy(to);
    const r = await rpc("freight_commercial_status", { _load: l.id, _to: to, _reason: null, _expected_version: l.version });
    setBusy(null);
    r.ok ? toast.success(`Marked ${STATUS_LABEL[to]}.`) : toast.error(r.message);
    void inv();
  };
  const cancel = async () => {
    const reason = window.prompt("Why cancel this load? An admin must approve.");
    if (!reason) return;
    const r = await rpc("freight_approval_request", { _company: l.company_id, _action: "cancel_load", _load: l.id, _payload: { load_id: l.id }, _reason: reason, _why: "Cancellation requested from load page" });
    r.ok ? toast.success("Cancellation sent for approval.") : toast.error(r.message);
    void inv();
  };
  const opts = next[l.status] ?? [];
  if (!opts.length && ["delivered", "cancelled"].includes(l.status)) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold">Booking</h2>
      <p className="mt-1 text-sm text-muted-foreground">Draft → Tendered → Accepted or Countered → Assigned → In transit → Delivered.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map((o) => <FButton key={o} variant={o === "draft" ? "outline" : "primary"} busy={busy === o} onClick={() => go(o)}>{o === "draft" ? "Back to draft" : `Mark ${STATUS_LABEL[o]}`}</FButton>)}
        <FButton variant="outline" onClick={cancel}>Request cancellation</FButton>
      </div>
    </Card>
  );
}

function Status({ l, admin, mgr }: { l: LoadRow; admin: boolean; mgr: boolean }) {
  const inv = useInvalidate();
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState("");
  if (!l.op_status || ["delivered", "cancelled"].includes(l.status)) return null;
  const idx = OP_STEPS.indexOf(l.op_status as (typeof OP_STEPS)[number]);
  const nxt = l.op_status === "exception" ? null : OP_STEPS[idx + 1];
  const go = async (to: string, reason: string | null) => {
    setBusy(true);
    const r = await rpc("freight_load_status", { _load: l.id, _to: to, _reason: reason, _expected_version: l.version });
    setBusy(false);
    r.ok ? toast.success(`Updated: ${OP_LABEL[to]}.`) : toast.error(r.message);
    void inv();
  };
  return (
    <Card>
      <h2 className="text-lg font-semibold">Trip progress</h2>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {OP_STEPS.map((s, i) => <li key={s}><Badge tone={i < idx ? "ok" : i === idx ? "info" : "neutral"}>{OP_LABEL[s]}</Badge></li>)}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {nxt && <FButton busy={busy} onClick={() => go(nxt, nxt === "delivered" && override ? override : null)}>Mark {OP_LABEL[nxt]}</FButton>}
        {l.op_status === "exception" && mgr && OP_STEPS.slice(0, 6).map((s) => <FButton key={s} size="sm" variant="outline" onClick={() => go(s, null)}>Resume at {OP_LABEL[s]}</FButton>)}
        {l.op_status !== "exception" && <FButton variant="danger" onClick={() => { const r = window.prompt("Describe the problem"); if (r) void go("exception", r); }}>Report exception</FButton>}
      </div>
      {admin && nxt === "delivered" && !l.pod_document_id && (
        <div className="mt-4"><Field label="Admin override reason (no POD on file)" hint="At least 10 characters. This is recorded in the audit trail."><FInput value={override} onChange={(e) => setOverride(e.target.value)} /></Field></div>
      )}
    </Card>
  );
}

function Assign({ l }: { l: LoadRow }) {
  const { company } = useFreight();
  const team = useTeam(company?.id);
  const eq = useRows<{ id: string; kind: string; unit_number: string; status: string }>("freight_equipment", company?.id, { select: "id,kind,unit_number,status", order: "unit_number", ascending: true });
  const inv = useInvalidate();
  const [d, setD] = useState(l.driver_id ?? "");
  const [t, setT] = useState(l.truck_id ?? "");
  const [tr, setTr] = useState(l.trailer_id ?? "");
  const [busy, setBusy] = useState(false);
  if (["delivered", "cancelled"].includes(l.status)) return null;
  const drivers = (team.data ?? []).filter((m) => m.roles.includes("driver"));
  const already = !!l.driver_id;
  const submit = async () => {
    setBusy(true);
    const r = already
      ? await rpc("freight_approval_request", { _company: l.company_id, _action: "reassign", _load: l.id, _payload: { driver_id: d, truck_id: t, trailer_id: tr }, _reason: "Reassignment", _why: "Dispatcher changed driver or equipment on an assigned load" })
      : await rpc("freight_load_assign", { _load: l.id, _driver: d, _truck: t || null, _trailer: tr || null, _expected_version: l.version });
    setBusy(false);
    r.ok ? toast.success(already ? "Reassignment sent for admin approval." : "Assigned. The driver must accept.") : toast.error(r.message);
    void inv();
  };
  return (
    <Card>
      <h2 className="text-lg font-semibold">Assignment</h2>
      {l.driver_response && <p className="mt-1 text-sm">Driver response: <Badge tone={statusTone(l.driver_response)}>{l.driver_response}</Badge>{l.driver_response_reason && <span className="ml-2 text-muted-foreground">“{l.driver_response_reason}”</span>}</p>}
      <div className="mt-3 space-y-3">
        <Field label="Driver"><FSelect value={d} onChange={(e) => setD(e.target.value)}><option value="">Choose…</option>{drivers.map((m) => <option key={m.user_id} value={m.user_id}>{m.name ?? m.email}{m.available === false ? " (unavailable)" : ""}</option>)}</FSelect></Field>
        <Field label="Truck"><FSelect value={t} onChange={(e) => setT(e.target.value)}><option value="">None</option>{(eq.data ?? []).filter((e) => e.kind === "truck").map((e) => <option key={e.id} value={e.id}>{e.unit_number} · {e.status}</option>)}</FSelect></Field>
        <Field label="Trailer"><FSelect value={tr} onChange={(e) => setTr(e.target.value)}><option value="">None</option>{(eq.data ?? []).filter((e) => e.kind === "trailer").map((e) => <option key={e.id} value={e.id}>{e.unit_number} · {e.status}</option>)}</FSelect></Field>
        {!drivers.length && <p className="text-sm text-muted-foreground">No drivers yet. Invite one from Admin.</p>}
        <FButton className="w-full" busy={busy} disabled={!d} onClick={submit}>{already ? "Request reassignment" : "Assign"}</FButton>
        <p className="text-xs text-muted-foreground">The server checks required fields, schedule overlaps, equipment status and expiring documents.</p>
      </div>
    </Card>
  );
}

function Money({ l }: { l: LoadRow }) {
  const { has } = useFreight();
  const fin = useRows<Fin>("freight_load_financials", l.company_id, { eq: { load_id: l.id }, order: "updated_at" });
  const inv = useInvalidate();
  const [rate, setRate] = useState("");
  const f = fin.data?.[0];
  if (fin.error) return null;
  const req = async () => {
    const r = await rpc("freight_approval_request", { _company: l.company_id, _action: "rate_change", _load: l.id, _payload: { customer_rate_cents: Math.round(Number(rate) * 100), carrier_pay_cents: f?.carrier_pay_cents ?? null }, _reason: `Rate change to $${rate}`, _why: "Rate change requested on load page" });
    r.ok ? toast.success("Rate change sent for approval.") : toast.error(r.message);
    setRate("");
    void inv();
  };
  const invoice = async () => {
    const r = await rpc("freight_invoice_draft", { _load: l.id });
    r.ok ? toast.success("Invoice draft created. It needs approval before sending.") : toast.error(r.message);
    void inv();
  };
  return (
    <Card>
      <h2 className="text-lg font-semibold">Rates</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Customer rate</dt><dd className="font-semibold">{money(f?.customer_rate_cents)}</dd></div>
        <div><dt className="text-muted-foreground">Carrier pay</dt><dd className="font-semibold">{money(f?.carrier_pay_cents)}</dd></div>
      </dl>
      <p className="mt-2 text-xs">{f?.rate_confirmed ? <Badge tone="ok">Rate confirmed</Badge> : <Badge>Not confirmed</Badge>}</p>
      {has("admin", "broker", "finance") && l.status !== "cancelled" && (
        <div className="mt-3 flex gap-2"><FInput type="number" min={0} step="0.01" placeholder="New rate (USD)" aria-label="New rate" value={rate} onChange={(e) => setRate(e.target.value)} /><FButton variant="outline" disabled={!rate} onClick={req}>Request</FButton></div>
      )}
      {has("admin", "finance", "broker") && l.status === "delivered" && <FButton className="mt-3 w-full" variant="outline" onClick={invoice}>Draft invoice</FButton>}
    </Card>
  );
}

function Timeline({ l }: { l: LoadRow }) {
  const ev = useRows<Ev>("freight_load_events", l.company_id, { eq: { load_id: l.id } });
  return (
    <Card>
      <h2 className="text-lg font-semibold">Timeline</h2>
      {!ev.data?.length ? <p className="mt-2 text-sm text-muted-foreground">No history yet.</p> : (
        <ol className="mt-3 space-y-3 border-l border-border pl-4">
          {ev.data.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium">{e.kind.replace(/_/g, " ")}{e.to_value ? ` → ${OP_LABEL[e.to_value] ?? STATUS_LABEL[e.to_value] ?? e.to_value}` : ""}</p>
              <p className="text-xs text-muted-foreground">{when(e.created_at)} · v{e.version}{e.reason ? ` · ${e.reason}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
