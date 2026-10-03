import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { boardColumn, useFreight, useLoads } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { LoadList } from "@/components/freight/LoadList";
import { Card, ErrorNote, FButton, Loading, PageHeader, Stat } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command center — Hercules Freight OS" }, { name: "description", content: "Today's freight at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { company, role, has } = useFreight();
  const loads = useLoads(company?.id);
  const runs = useRows<{ id: string }>("freight_automation_runs", company?.id, { eq: { status: "open" }, enabled: has("admin", "dispatcher", "broker", "fleet_owner", "finance") });
  const approvals = useRows<{ id: string }>("freight_approvals", company?.id, { eq: { status: "pending" }, enabled: has("admin", "finance", "dispatcher", "broker") });
  if (role === "driver") return <Navigate to="/driver" />;
  if (role === "shipper") return <Navigate to="/shipper" />;
  if (loads.isLoading) return <Loading />;
  if (loads.error) return <ErrorNote>Couldn't load your freight. Refresh to try again.</ErrorNote>;
  const all = loads.data ?? [];
  const count = (c: string) => all.filter((l) => boardColumn(l) === c).length;
  const canCreate = has("admin", "dispatcher", "broker");
  return (
    <>
      <PageHeader title="Command center" sub={company?.name} actions={canCreate && <Link to="/loads/new"><FButton>New load</FButton></Link>} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Unassigned" value={count("Unassigned")} />
        <Stat label="In motion" value={count("Pickup") + count("Transit") + count("Delivery")} />
        <Stat label="Exceptions" value={count("Exception")} />
        <Stat label="Waiting on you" value={(runs.data?.length ?? 0) + (approvals.data?.length ?? 0)} hint="Suggestions and approvals" />
      </div>
      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-lg font-semibold">Upcoming loads</h2>
          <Link to="/loads" className="text-sm font-semibold text-primary underline">All loads</Link>
        </div>
        <LoadList loads={all.filter((l) => boardColumn(l) !== "Completed" && l.status !== "cancelled").slice(0, 12)} emptyBody={canCreate ? "Create your first load to start dispatching." : "Loads your company creates will show here."} action={canCreate && <Link to="/loads/new"><FButton>Create a load</FButton></Link>} />
      </Card>
    </>
  );
}
