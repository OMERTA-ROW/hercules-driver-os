import { createFileRoute } from "@tanstack/react-router";
import { money, useFreight, useLoads } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { Card, Loading, PageHeader, Stat } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Hercules Freight OS" }, { name: "description", content: "Performance from your actual loads." }] }),
  component: Analytics,
});

function Analytics() {
  const { company, has } = useFreight();
  const q = useLoads(company?.id);
  const fin = useRows<{ load_id: string; customer_rate_cents: number | null; carrier_pay_cents: number | null }>("freight_load_financials", company?.id, { order: "updated_at", enabled: has("admin", "finance", "broker", "dispatcher") });
  if (q.isLoading) return <Loading />;
  const loads = q.data ?? [];
  const delivered = loads.filter((l) => l.status === "delivered");
  const onTime = delivered.filter((l) => l.delivery_at && new Date(l.updated_at) <= new Date(new Date(l.delivery_at).getTime() + 3600e3)).length;
  const lanes = new Map<string, number>();
  for (const l of loads) if (l.origin && l.destination) lanes.set(`${l.origin} → ${l.destination}`, (lanes.get(`${l.origin} → ${l.destination}`) ?? 0) + 1);
  const rev = fin.data?.filter((f) => delivered.some((l) => l.id === f.load_id)) ?? null;
  const gross = rev?.reduce((s, f) => s + (f.customer_rate_cents ?? 0), 0);
  const cost = rev?.reduce((s, f) => s + (f.carrier_pay_cents ?? 0), 0);
  return (
    <>
      <PageHeader title="Analytics" sub="Computed from loads in this workspace. Nothing is estimated." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total loads" value={loads.length} />
        <Stat label="Delivered" value={delivered.length} />
        <Stat label="On-time (≤1h after appt.)" value={delivered.length ? `${Math.round((onTime / delivered.length) * 100)}%` : "—"} hint="Based on last update time" />
        <Stat label="Gross margin" value={rev ? money((gross ?? 0) - (cost ?? 0)) : "Restricted"} hint={rev ? `Revenue ${money(gross)}` : "Needs finance access"} />
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Top lanes</h2>
        {lanes.size === 0 ? <p className="mt-2 text-sm text-muted-foreground">No lanes yet.</p> : (
          <ul className="mt-3 space-y-2 text-sm">
            {[...lanes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => <li key={k} className="flex justify-between border-b border-border pb-1"><span>{k}</span><strong>{v}</strong></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
