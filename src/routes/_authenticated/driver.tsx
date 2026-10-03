import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Phone, Truck } from "lucide-react";
import { OP_LABEL, OP_STEPS, rpc, useFreight, useLoads, when, type LoadRow } from "@/lib/freight";
import { useInvalidate } from "@/lib/freight-data";
import { LoadDocs } from "@/components/freight/LoadDocs";
import { Badge, Card, Empty, ErrorNote, FButton, FTextarea, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({ meta: [{ title: "My loads — Hercules Freight OS" }, { name: "description", content: "Your assigned loads and next steps." }] }),
  component: DriverHome,
});

function DriverHome() {
  const { company, userId, has } = useFreight();
  const q = useLoads(company?.id);
  if (!has("driver")) return <ErrorNote>This workspace is for drivers. Your company hasn't given you the driver role.</ErrorNote>;
  if (q.isLoading) return <Loading />;
  const mine = (q.data ?? []).filter((l) => l.driver_id === userId);
  const active = mine.filter((l) => !["delivered", "cancelled"].includes(l.status));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My loads" sub={active.length ? `${active.length} active` : undefined} />
      {active.length === 0 ? <Empty icon={Truck} title="No assigned loads" body="When dispatch assigns you a load, it appears here for you to accept." /> : active.map((l) => <DriverLoad key={l.id} l={l} />)}
      {mine.length > active.length && <p className="mt-6 text-sm text-muted-foreground">{mine.length - active.length} completed loads in your history.</p>}
    </div>
  );
}

function DriverLoad({ l }: { l: LoadRow }) {
  const inv = useInvalidate();
  const [busy, setBusy] = useState(false);
  const [decline, setDecline] = useState<string | null>(null);
  const respond = async (accept: boolean) => {
    setBusy(true);
    const r = await rpc("freight_driver_respond", { _load: l.id, _accept: accept, _reason: accept ? null : decline });
    setBusy(false);
    r.ok ? toast.success(accept ? "Accepted. Drive safe." : "Declined. Dispatch has been told.") : toast.error(r.message);
    setDecline(null);
    void inv();
  };
  const step = async (to: string, reason: string | null = null) => {
    setBusy(true);
    const r = await rpc("freight_load_status", { _load: l.id, _to: to, _reason: reason, _expected_version: l.version });
    setBusy(false);
    r.ok ? toast.success(OP_LABEL[to]) : toast.error(r.message);
    void inv();
  };
  const idx = OP_STEPS.indexOf(l.op_status as (typeof OP_STEPS)[number]);
  const nxt = l.op_status && l.op_status !== "exception" ? OP_STEPS[idx + 1] : null;

  return (
    <Card className="mb-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{l.reference}</p>
          <p className="mt-1 text-xl font-semibold">{l.origin} → {l.destination}</p>
        </div>
        {l.op_status && <Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status]}</Badge>}
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <p className="flex gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Pickup {when(l.pickup_at)} · Delivery {when(l.delivery_at)}</p>
        <p>{l.equipment_type} · {l.commodity} · {l.weight_lb?.toLocaleString()} lb</p>
        {l.contact_phone && <a href={`tel:${l.contact_phone}`} className="flex gap-2 font-semibold text-primary"><Phone className="h-4 w-4" />{l.contact_name} {l.contact_phone}</a>}
        {l.notes && <p className="text-muted-foreground">{l.notes}</p>}
      </div>

      {l.driver_response === "pending" && (
        decline === null ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <FButton size="lg" variant="success" busy={busy} onClick={() => respond(true)}>Accept</FButton>
            <FButton size="lg" variant="outline" onClick={() => setDecline("")}>Decline</FButton>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <FTextarea rows={2} placeholder="Why are you declining?" aria-label="Decline reason" value={decline} onChange={(e) => setDecline(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <FButton size="lg" variant="danger" busy={busy} disabled={decline.trim().length < 3} onClick={() => respond(false)}>Send decline</FButton>
              <FButton size="lg" variant="ghost" onClick={() => setDecline(null)}>Back</FButton>
            </div>
          </div>
        )
      )}
      {l.driver_response === "accepted" && (
        <div className="mt-5 grid gap-3">
          {nxt && <FButton size="lg" busy={busy} onClick={() => step(nxt)}>Next: {OP_LABEL[nxt]}</FButton>}
          {l.op_status === "exception" && <p className="text-sm text-warn">Exception reported. Dispatch will clear it before you continue.</p>}
          {l.op_status !== "exception" && <FButton size="lg" variant="outline" onClick={() => { const r = window.prompt("What's the problem?"); if (r) void step("exception", r); }}>Report a problem</FButton>}
          {nxt === "delivered" && <p className="text-xs text-muted-foreground">Upload the signed POD below before marking delivered.</p>}
        </div>
      )}
      {l.driver_response === "accepted" && (
        <div className="mt-5 border-t border-border pt-4">
          <LoadDocs companyId={l.company_id} loadId={l.id} kinds={["pod", "bol", "rate_confirmation", "receipt", "image", "signature", "issue"]} />
        </div>
      )}
    </Card>
  );
}
