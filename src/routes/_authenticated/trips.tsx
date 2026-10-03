import { createFileRoute } from "@tanstack/react-router";
import { useFreight, useLoads, useTeam } from "@/lib/freight";
import { LoadList } from "@/components/freight/LoadList";
import { Loading, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({ meta: [{ title: "Trips — Hercules Freight OS" }, { name: "description", content: "Active trips by driver." }] }),
  component: Trips,
});

function Trips() {
  const { company } = useFreight();
  const q = useLoads(company?.id);
  const team = useTeam(company?.id);
  if (q.isLoading) return <Loading />;
  const active = (q.data ?? []).filter((l) => l.op_status && !["delivered", "cancelled"].includes(l.status));
  const byDriver = new Map<string, typeof active>();
  for (const l of active) byDriver.set(l.driver_id ?? "", [...(byDriver.get(l.driver_id ?? "") ?? []), l]);
  return (
    <>
      <PageHeader title="Trips" sub="Loads with an assigned driver that are not yet delivered." />
      {active.length === 0 ? <LoadList loads={[]} emptyBody="No active trips. Assign a driver from a load to start one." /> :
        [...byDriver.entries()].map(([d, ls]) => {
          const m = team.data?.find((x) => x.user_id === d);
          return (
            <section key={d} className="mb-6">
              <h2 className="mb-2 font-semibold">{m?.name ?? m?.email ?? "Driver"}</h2>
              <LoadList loads={ls} />
            </section>
          );
        })}
    </>
  );
}
