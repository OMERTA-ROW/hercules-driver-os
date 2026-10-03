import { useState, type FormEvent } from "react";
import { rpc, useFreight, type LoadRow } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { ErrorNote, Field, FButton, FInput, FSelect, FTextarea } from "./ui";

const toLocal = (s: string | null) => (s ? new Date(new Date(s).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const EQUIP = ["Dry van", "Reefer", "Flatbed", "Step deck", "Power only", "Box truck", "Cargo van", "Car hauler", "Tanker"];

export function LoadForm({ load, onSaved }: { load?: LoadRow; onSaved: (id: string) => void }) {
  const { company, has } = useFreight();
  const customers = useRows<{ id: string; name: string }>("freight_customers", company?.id, { select: "id,name", order: "name", ascending: true });
  const [f, setF] = useState({
    reference: load?.reference ?? "",
    customer_id: load?.customer_id ?? "",
    origin: load?.origin ?? "",
    destination: load?.destination ?? "",
    pickup_at: toLocal(load?.pickup_at ?? null),
    delivery_at: toLocal(load?.delivery_at ?? null),
    equipment_type: load?.equipment_type ?? "",
    commodity: load?.commodity ?? "",
    weight_lb: load?.weight_lb?.toString() ?? "",
    contact_name: load?.contact_name ?? "",
    contact_phone: load?.contact_phone ?? "",
    notes: load?.notes ?? "",
    rate: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const canRate = has("admin", "broker", "finance") && (!load || ["draft", "tendered", "countered"].includes(load.status));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const payload: Record<string, unknown> = { ...f };
    delete payload["rate"];
    if (load) delete payload["reference"];
    payload["pickup_at"] = f.pickup_at ? new Date(f.pickup_at).toISOString() : "";
    payload["delivery_at"] = f.delivery_at ? new Date(f.delivery_at).toISOString() : "";
    if (canRate && f.rate) payload["customer_rate_cents"] = Math.round(Number(f.rate) * 100);
    const r = await rpc("freight_load_save", { _company: company!.id, _load: load?.id ?? null, _f: payload, _expected_version: load?.version ?? 0 });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSaved(String(r["id"]));
  };

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {!load && <Field label="Reference" hint="Leave blank to generate one."><FInput value={f.reference} onChange={set("reference")} maxLength={40} /></Field>}
      <Field label="Customer / shipper" required>
        <FSelect value={f.customer_id} onChange={set("customer_id")}>
          <option value="">Choose…</option>
          {(customers.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FSelect>
      </Field>
      <Field label="Origin" required><FInput value={f.origin} onChange={set("origin")} placeholder="City, ST" /></Field>
      <Field label="Destination" required><FInput value={f.destination} onChange={set("destination")} placeholder="City, ST" /></Field>
      <Field label="Pickup appointment" required><FInput type="datetime-local" value={f.pickup_at} onChange={set("pickup_at")} /></Field>
      <Field label="Delivery appointment" required><FInput type="datetime-local" value={f.delivery_at} onChange={set("delivery_at")} /></Field>
      <Field label="Equipment type" required>
        <FSelect value={f.equipment_type} onChange={set("equipment_type")}>
          <option value="">Choose…</option>
          {EQUIP.map((x) => <option key={x}>{x}</option>)}
        </FSelect>
      </Field>
      <Field label="Commodity" required><FInput value={f.commodity} onChange={set("commodity")} /></Field>
      <Field label="Weight (lb)" required><FInput type="number" min={1} max={200000} value={f.weight_lb} onChange={set("weight_lb")} /></Field>
      <Field label="Site contact" required><FInput value={f.contact_name} onChange={set("contact_name")} /></Field>
      <Field label="Contact phone"><FInput type="tel" value={f.contact_phone} onChange={set("contact_phone")} /></Field>
      {canRate && <Field label="Customer rate (USD)" hint="Rate changes after tendering need approval."><FInput type="number" min={0} step="0.01" value={f.rate} onChange={set("rate")} /></Field>}
      <div className="md:col-span-2"><Field label="Notes"><FTextarea rows={3} value={f.notes} onChange={set("notes")} /></Field></div>
      {(customers.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground md:col-span-2">No customers yet — add one on the Customers page. Drafts can be saved without one.</p>}
      {err && <div className="md:col-span-2"><ErrorNote>{err}</ErrorNote></div>}
      <div className="md:col-span-2"><FButton type="submit" busy={busy} size="lg">{load ? "Save changes" : "Save draft"}</FButton></div>
    </form>
  );
}
