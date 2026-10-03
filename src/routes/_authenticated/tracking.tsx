import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPinOff } from "lucide-react";
import { OP_LABEL, useFreight, useLoads, when } from "@/lib/freight";
import { Badge, Card, Empty, FButton, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/tracking")({
  head: () => ({ meta: [{ title: "Tracking — Hercules Freight OS" }, { name: "description", content: "Load progress from driver status updates." }] }),
  component: Tracking,
});

function Tracking() {
  const { company, has } = useFreight();
  const q = useLoads(company?.id);
  if (q.isLoading) return <Loading />;
  const moving = (q.data ?? []).filter((l) => l.op_status && l.status !== "delivered" && l.status !== "cancelled");
  return (
    <>
      <PageHeader title="Tracking" />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm"><strong>Live GPS isn't connected.</strong> Progress below comes from driver status updates only. Connect an ELD or telematics provider to see positions.</p>
          {has("admin") && <Link to="/integrations"><FButton variant="outline" size="sm">Integrations</FButton></Link>}
        </div>
      </Card>
      {moving.length === 0 ? <Empty icon={MapPinOff} title="Nothing moving" body="Loads appear here once a driver accepts and starts the trip." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {moving.map((l) => (
            <Link key={l.id} to="/loads/$id" params={{ id: l.id }} className="hfo-card block p-4 hover:border-primary">
              <div className="flex justify-between"><span className="font-semibold">{l.reference}</span><Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status!]}</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">{l.origin} → {l.destination}</p>
              <p className="mt-1 text-xs">Last update {when(l.updated_at)} · Due {when(l.delivery_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
