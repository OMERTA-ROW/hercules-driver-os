import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFreight, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Directory } from "@/components/freight/Directory";
import { Card, Field, FButton, FInput, FSelect } from "@/components/freight/ui";

export const Route = createFileRoute("/freight-equipment")({
  head: () => ({ meta: [{ title: "Equipment — Hercules Freight OS" }, { name: "description", content: "Trucks, trailers, documents and maintenance." }] }),
  component: Equipment,
});

function Equipment() {
  const { has, company } = useFreight();
  const inv = useInvalidate();
  const canWrite = has("admin", "fleet_owner");
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("freight_equipment").update({ status }).eq("id", id);
    error ? toast.error("Couldn't update.") : toast.success("Status updated.");
    void inv();
  };
  return (
    <>
      <Directory
        table="freight_equipment"
        title="Equipment"
        icon={Boxes}
        canWrite={canWrite}
        cols={[
          { key: "kind", label: "Kind", type: "select", options: ["truck", "trailer"] },
          { key: "unit_number", label: "Unit #", required: true },
          { key: "equipment_type", label: "Type" },
          { key: "plate", label: "Plate" },
          { key: "vin", label: "VIN", hideInList: true },
          { key: "status", label: "Status", type: "select", options: ["available", "maintenance", "out_of_service"] },
          { key: "insurance_expires", label: "Insurance expires", type: "date" },
          { key: "registration_expires", label: "Registration expires", type: "date" },
          { key: "permit_expires", label: "Permit expires", type: "date", hideInList: true },
          { key: "inspection_expires", label: "Inspection expires", type: "date", hideInList: true },
        ]}
        extra={(r) => canWrite && (
          <FSelect aria-label="Change status" value={String(r["status"])} onChange={(e) => setStatus(String(r["id"]), e.target.value)} className="h-9 min-w-[150px]">
            {["available", "in_use", "maintenance", "out_of_service"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </FSelect>
        )}
      />
      {company && has("admin", "dispatcher", "fleet_owner") && <Maintenance canWrite={canWrite} />}
    </>
  );
}

function Maintenance({ canWrite }: { canWrite: boolean }) {
  const { company, userId } = useFreight();
  const eq = useRows<{ id: string; unit_number: string }>("freight_equipment", company?.id, { select: "id,unit_number", order: "unit_number", ascending: true });
  const mx = useRows<{ id: string; equipment_id: string; description: string; scheduled_for: string | null; completed_at: string | null; cost_cents: number | null }>("freight_maintenance", company?.id);
  const inv = useInvalidate();
  const [f, setF] = useState({ equipment_id: "", description: "", scheduled_for: "" });
  const add = async () => {
    const { error } = await supabase.from("freight_maintenance").insert({ company_id: company!.id, created_by: userId!, equipment_id: f.equipment_id, description: f.description, scheduled_for: f.scheduled_for || null });
    error ? toast.error("Couldn't add.") : toast.success("Maintenance scheduled.");
    setF({ equipment_id: "", description: "", scheduled_for: "" });
    void inv();
  };
  const done = async (id: string) => {
    const { error } = await supabase.from("freight_maintenance").update({ completed_at: new Date().toISOString() }).eq("id", id);
    error ? toast.error("Couldn't update.") : void inv();
  };
  return (
    <Card className="mt-8">
      <h2 className="text-lg font-semibold">Maintenance</h2>
      {canWrite && (
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Field label="Unit"><FSelect value={f.equipment_id} onChange={(e) => setF({ ...f, equipment_id: e.target.value })}><option value="">Choose…</option>{(eq.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.unit_number}</option>)}</FSelect></Field>
          <Field label="Work"><FInput value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Scheduled"><FInput type="date" value={f.scheduled_for} onChange={(e) => setF({ ...f, scheduled_for: e.target.value })} /></Field>
          <div className="flex items-end"><FButton disabled={!f.equipment_id || !f.description} onClick={add}>Schedule</FButton></div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-border text-sm">
        {(mx.data ?? []).length === 0 && <li className="py-2 text-muted-foreground">No maintenance recorded.</li>}
        {(mx.data ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2">
            <span><strong>{eq.data?.find((e) => e.id === m.equipment_id)?.unit_number}</strong> — {m.description} · {m.scheduled_for ?? "unscheduled"}</span>
            {m.completed_at ? <span className="text-ok">Done {when(m.completed_at)}</span> : canWrite && <FButton size="sm" variant="outline" onClick={() => done(m.id)}>Mark done</FButton>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
