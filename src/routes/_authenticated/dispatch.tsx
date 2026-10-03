import { createFileRoute, Link } from "@tanstack/react-router";
import { boardColumn, OP_LABEL, useFreight, useLoads, when, type BoardColumn } from "@/lib/freight";
import { useRows } from "@/lib/freight-data";
import { Badge, Card, ErrorNote, FButton, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch board — Hercules Freight OS" }, { name: "description", content: "Unassigned through completed loads." }] }),
  component: Board,
});

const COLS: BoardColumn[] = ["Unassigned", "Assigned", "Pickup", "Transit", "Delivery", "Exception", "Completed"];

function Board() {
  const { company, has } = useFreight();
  const q = useLoads(company?.id);
  const ex = useRows<{ id: string; load_id: string; description: string; created_at: string }>("freight_exceptions", company?.id, { eq: { resolved_at: null } });
  if (!has("admin", "dispatcher")) return <ErrorNote>The dispatch board is for admins and dispatchers.</ErrorNote>;
  if (q.isLoading) return <Loading />;
  const loads = q.data ?? [];
  return (
    <>
      <PageHeader title="Dispatch board" actions={<Link to="/loads/new"><FButton>New load</FButton></Link>} />
      {(ex.data?.length ?? 0) > 0 && (
        <Card className="mb-5 border-destructive/40">
          <h2 className="font-semibold text-destructive">Exception queue ({ex.data!.length})</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {ex.data!.map((e) => <li key={e.id}><Link to="/loads/$id" params={{ id: e.load_id }} className="font-semibold underline">{loads.find((l) => l.id === e.load_id)?.reference ?? "Load"}</Link> — {e.description} <span className="text-muted-foreground">({when(e.created_at)})</span></li>)}
          </ul>
        </Card>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLS.map((c) => {
          const items = loads.filter((l) => boardColumn(l) === c);
          return (
            <section key={c} className="w-72 shrink-0 rounded-xl bg-surface p-3" aria-label={c}>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">{c}<span className="text-muted-foreground">{items.length}</span></h2>
              <div className="space-y-2">
                {items.length === 0 && <p className="px-1 text-xs text-muted-foreground">Nothing here.</p>}
                {items.map((l) => (
                  <Link key={l.id} to="/loads/$id" params={{ id: l.id }} className="block rounded-lg border border-border bg-card p-3 text-sm shadow-sm hover:border-primary">
                    <p className="font-semibold">{l.reference}</p>
                    <p className="text-muted-foreground">{l.origin ?? "—"} → {l.destination ?? "—"}</p>
                    <p className="mt-1 text-xs">{when(l.pickup_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {l.driver_response && <Badge tone={statusTone(l.driver_response)}>{l.driver_response}</Badge>}
                      {l.op_status && c !== "Completed" && <Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status]}</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
