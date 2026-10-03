import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { STATUS_LABEL, rpc, useFreight, useLoads } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { LoadList } from "@/components/freight/LoadList";
import { Card, ErrorNote, Field, FButton, FInput, FSelect, Loading, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/broker")({
  head: () => ({ meta: [{ title: "Brokerage — Hercules Freight OS" }, { name: "description", content: "Tender loads and book verified carriers." }] }),
  component: Broker,
});

function Broker() {
  const { company, has } = useFreight();
  const q = useLoads(company?.id);
  const carriers = useRows<{ id: string; name: string; verification_status: string }>("freight_carriers", company?.id, { order: "name", ascending: true });
  const inv = useInvalidate();
  const [load, setLoad] = useState("");
  const [carrier, setCarrier] = useState("");
  const [pay, setPay] = useState("");
  if (!has("admin", "broker")) return <ErrorNote>Brokerage is for admins and brokers.</ErrorNote>;
  if (q.isLoading) return <Loading />;
  const loads = q.data ?? [];
  const bookable = loads.filter((l) => ["tendered", "countered"].includes(l.status));
  const book = async () => {
    const r = await rpc("freight_approval_request", { _company: company!.id, _action: "carrier_booking", _load: load, _payload: { carrier_id: carrier, carrier_pay_cents: Math.round(Number(pay) * 100) }, _reason: `Book carrier at $${pay}`, _why: "Broker selected a carrier" });
    r.ok ? toast.success("Booking sent for admin approval.") : toast.error(r.message);
    void inv();
  };
  const groups = ["draft", "tendered", "countered", "accepted", "assigned", "in_transit"];
  return (
    <>
      <PageHeader title="Brokerage" actions={<Link to="/loads/new"><FButton>New load request</FButton></Link>} />
      <Card className="mb-6">
        <h2 className="text-lg font-semibold">Book a carrier</h2>
        <p className="text-sm text-muted-foreground">Only verified carriers can be booked. Every booking needs an admin's approval; the rate is then confirmed.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Field label="Load"><FSelect value={load} onChange={(e) => setLoad(e.target.value)}><option value="">Choose…</option>{bookable.map((l) => <option key={l.id} value={l.id}>{l.reference} · {STATUS_LABEL[l.status]}</option>)}</FSelect></Field>
          <Field label="Carrier"><FSelect value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="">Choose…</option>{(carriers.data ?? []).map((c) => <option key={c.id} value={c.id} disabled={c.verification_status !== "verified"}>{c.name}{c.verification_status !== "verified" ? " (not verified)" : ""}</option>)}</FSelect></Field>
          <Field label="Carrier pay (USD)"><FInput type="number" min={0} step="0.01" value={pay} onChange={(e) => setPay(e.target.value)} /></Field>
          <div className="flex items-end"><FButton className="w-full" disabled={!load || !carrier || !pay} onClick={book}>Request booking</FButton></div>
        </div>
      </Card>
      {groups.map((g) => {
        const ls = loads.filter((l) => l.status === g);
        if (!ls.length) return null;
        return <section key={g} className="mb-6"><h2 className="mb-2 font-semibold">{STATUS_LABEL[g]} ({ls.length})</h2><LoadList loads={ls} /></section>;
      })}
      {loads.length === 0 && <LoadList loads={[]} emptyBody="Create a load request to start tendering." />}
    </>
  );
}
