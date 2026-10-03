import { createFileRoute } from "@tanstack/react-router";
import { money, useFreight, useLoads, useTeam } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { Card, ErrorNote, Loading, PageHeader, Stat, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({ meta: [{ title: "Fleet overview — Hercules Freight OS" }, { name: "description", content: "Fleet utilization, compliance and revenue from real loads." }] }),
  component: Fleet,
});

const within = (d: string | null, days: number) => !!d && new Date(d).getTime() - Date.now() < days * 864e5;

function Fleet() {
  const { company, has } = useFreight();
  const eq = useRows<{ id: string; unit_number: string; kind: string; status: string; insurance_expires: string | null; registration_expires: string | null; permit_expires: string | null }>("freight_equipment", company?.id);
  const loads = useLoads(company?.id);
  const team = useTeam(company?.id);
  const fin = useRows<{ load_id: string; customer_rate_cents: number | null }>("freight_load_financials", company?.id, { order: "updated_at", enabled: has("admin", "finance", "broker", "dispatcher") });
  if (!has("admin", "fleet_owner")) return <ErrorNote>Fleet overview is for admins and fleet owners.</ErrorNote>;
  if (eq.isLoading || loads.isLoading) return <Loading />;
  const units = eq.data ?? [];
  const delivered = (loads.data ?? []).filter((l) => l.status === "delivered");
  const expiring = units.filter((u) => within(u.insurance_expires, 30) || within(u.registration_expires, 30) || within(u.permit_expires, 30));
  const revenue = fin.data ? fin.data.filter((f) => delivered.some((l) => l.id === f.load_id)).reduce((s, f) => s + (f.customer_rate_cents ?? 0), 0) : null;
  return (
    <>
      <PageHeader title="Fleet overview" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Units" value={units.length} hint={`${units.filter((u) => u.status === "available").length} available`} />
        <Stat label="Drivers" value={(team.data ?? []).filter((m) => m.roles.includes("driver")).length} />
        <Stat label="Delivered loads" value={delivered.length} />
        <Stat label="Delivered revenue" value={revenue == null ? "Restricted" : money(revenue)} hint={revenue == null ? "Needs finance access" : "Customer rates on delivered loads"} />
      </div>
      <Card className="mt-6 p-0">
        <h2 className="p-5 text-lg font-semibold">Documents expiring in 30 days</h2>
        {expiring.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing expiring soon.</p> : (
          <Table head={["Unit", "Insurance", "Registration", "Permit"]}>
            {expiring.map((u) => <tr key={u.id} className="border-t border-border"><Td>{u.unit_number}</Td><Td>{u.insurance_expires ?? "—"}</Td><Td>{u.registration_expires ?? "—"}</Td><Td>{u.permit_expires ?? "—"}</Td></tr>)}
          </Table>
        )}
      </Card>
      <Card className="mt-6 p-0">
        <h2 className="p-5 text-lg font-semibold">Loads per unit</h2>
        {units.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">Add equipment to see history.</p> : (
          <Table head={["Unit", "Kind", "Status", "Delivered loads"]}>
            {units.map((u) => <tr key={u.id} className="border-t border-border"><Td>{u.unit_number}</Td><Td>{u.kind}</Td><Td>{u.status.replace(/_/g, " ")}</Td><Td>{delivered.filter((l) => l.truck_id === u.id || l.trailer_id === u.id).length}</Td></tr>)}
          </Table>
        )}
      </Card>
    </>
  );
}
