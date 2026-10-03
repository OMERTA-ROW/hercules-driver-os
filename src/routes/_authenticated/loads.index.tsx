import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { STATUS_LABEL, useFreight, useLoads } from "@/lib/freight";
import { LoadList } from "@/components/freight/LoadList";
import { ErrorNote, FButton, FInput, FSelect, Loading, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/loads/")({
  head: () => ({ meta: [{ title: "Loads — Hercules Freight OS" }, { name: "description", content: "Every load in your company." }] }),
  component: Loads,
});

function Loads() {
  const { company, has } = useFreight();
  const q = useLoads(company?.id);
  const [s, setS] = useState("");
  const [st, setSt] = useState("");
  const rows = (q.data ?? []).filter(
    (l) => (!st || l.status === st) && (!s || `${l.reference} ${l.origin} ${l.destination} ${l.commodity}`.toLowerCase().includes(s.toLowerCase())),
  );
  return (
    <>
      <PageHeader title="Loads" actions={has("admin", "dispatcher", "broker") && <Link to="/loads/new"><FButton>New load</FButton></Link>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <FInput placeholder="Search reference, lane, commodity" aria-label="Search loads" value={s} onChange={(e) => setS(e.target.value)} className="max-w-sm" />
        <FSelect aria-label="Filter by status" value={st} onChange={(e) => setSt(e.target.value)} className="max-w-[200px]">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FSelect>
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorNote>Couldn't load loads.</ErrorNote> : <LoadList loads={rows} />}
    </>
  );
}
