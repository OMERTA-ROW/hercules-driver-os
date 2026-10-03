import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckSquare, ClipboardList, Plus } from "lucide-react";
import { FreightRoute } from "@/components/freight/FreightWorkspace";
import { LoadList } from "@/components/freight/LoadList";
import { ErrorNote, FInput, FSelect, Loading } from "@/components/freight/ui";
import { Button } from "@/components/ui/button";
import { EmptyState, Metric, Panel, Slab } from "@/components/hercules/primitives";
import { boardColumn, STATUS_LABEL, useFreight, useLoads } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";

export const Route = createFileRoute("/freight")({
  head: () => ({ meta: [{ title: "Freight Operations — HERCULES" }, { name: "description", content: "Tenant-scoped freight loads, approvals and operations." }] }),
  component: Page,
});

function Page() { return <FreightRoute title="Freight operations"><Overview /></FreightRoute>; }

function Overview() {
  const { company, has } = useFreight();
  const loads = useLoads(company?.id);
  const approvals = useRows<{ id: string }>("freight_approvals", company?.id, { eq: { status: "pending" }, enabled: has("admin", "finance", "dispatcher", "broker") });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  if (loads.isLoading) return <Panel><Loading label="Loading company loads" /></Panel>;
  if (loads.error) return <ErrorNote>Company freight could not be loaded. No data was changed.</ErrorNote>;
  const all = loads.data ?? [];
  const shown = all.filter((l) => (!status || l.status === status) && (!query || `${l.reference} ${l.origin} ${l.destination} ${l.commodity}`.toLowerCase().includes(query.toLowerCase())));
  const active = all.filter((l) => !["delivered", "cancelled"].includes(l.status));
  const canCreate = has("admin", "dispatcher", "broker");
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Slab><p className="label-cap">Active loads</p><Metric value={active.length} tone="primary" /></Slab>
      <Slab><p className="label-cap">In motion</p><Metric value={active.filter((l) => ["Pickup", "Transit", "Delivery"].includes(boardColumn(l) ?? "")).length} tone="go" /></Slab>
      <Slab><p className="label-cap">Exceptions</p><Metric value={all.filter((l) => boardColumn(l) === "Exception").length} tone="alert" /></Slab>
      <Slab><p className="label-cap">Pending approvals</p><Metric value={approvals.data?.length ?? 0} tone="warn" /></Slab>
    </div>
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-xl uppercase tracking-[0.12em]">Company loads</h2><p className="text-sm text-muted-foreground">Only records visible to your server-granted company role appear.</p></div>
        <div className="flex gap-2">{has("admin", "finance", "dispatcher", "broker") ? <Button asChild variant="outline"><Link to="/freight-control"><CheckSquare />Approvals</Link></Button> : null}{canCreate ? <Button asChild><Link to="/freight-loads/new"><Plus />New load</Link></Button> : null}</div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2"><FInput aria-label="Search company loads" placeholder="Search reference, lane, commodity" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" /><FSelect aria-label="Filter loads by status" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[190px]"><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</FSelect></div>
      {shown.length ? <LoadList loads={shown} /> : <EmptyState title="No matching company loads">Create a load if your granted role allows it, or adjust the filters.</EmptyState>}
    </Panel>
  </div>;
}
