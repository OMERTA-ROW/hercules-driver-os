import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { money, rpc, useFreight, useTeam } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Badge, Card, Empty, ErrorNote, Field, FButton, FInput, FSelect, Loading, PageHeader, statusTone, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/settlements")({
  head: () => ({ meta: [{ title: "Settlements — Hercules Freight OS" }, { name: "description", content: "Driver and carrier settlements." }] }),
  component: Settlements,
});

type S = { id: string; driver_user_id: string | null; period_start: string; period_end: string; amount_cents: number; status: string };

function Settlements() {
  const { company, has } = useFreight();
  const rows = useRows<S>("freight_settlements", company?.id);
  const fin = has("admin", "finance");
  const team = useTeam(company?.id, has("admin", "dispatcher", "fleet_owner"));
  const inv = useInvalidate();
  const [f, setF] = useState({ driver: "", start: "", end: "", amount: "" });
  if (rows.isLoading) return <Loading />;
  if (rows.error) return <ErrorNote>Your role can't view settlements.</ErrorNote>;
  const draft = async () => {
    const r = await rpc("freight_settlement_draft", { _company: company!.id, _driver: f.driver, _start: f.start, _end: f.end, _amount_cents: Math.round(Number(f.amount) * 100) });
    r.ok ? toast.success("Settlement drafted. It needs approval.") : toast.error(r.message);
    void inv();
  };
  const approve = async (s: S) => {
    const r = await rpc("freight_approval_request", { _company: company!.id, _action: "settlement", _load: null, _payload: { settlement_id: s.id }, _reason: "Approve settlement", _why: "Settlements need a second person" });
    r.ok ? toast.success("Sent for approval.") : toast.error(r.message);
    void inv();
  };
  const name = (id: string | null) => team.data?.find((m) => m.user_id === id)?.name ?? (has("driver") ? "You" : "Driver");
  return (
    <>
      <PageHeader title="Settlements" sub={has("driver") && !fin ? "Your own settlements only." : "Recorded manually; no payout provider is connected."} />
      {fin && (
        <Card className="mb-5">
          <h2 className="font-semibold">Draft a settlement</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <Field label="Driver"><FSelect value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })}><option value="">Choose…</option>{(team.data ?? []).filter((m) => m.roles.includes("driver")).map((m) => <option key={m.user_id} value={m.user_id}>{m.name ?? m.email}</option>)}</FSelect></Field>
            <Field label="From"><FInput type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="To"><FInput type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
            <Field label="Amount (USD)"><FInput type="number" min={0} step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
            <div className="flex items-end"><FButton disabled={!f.driver || !f.start || !f.end || !f.amount} onClick={draft}>Draft</FButton></div>
          </div>
        </Card>
      )}
      {!rows.data?.length ? <Empty icon={Wallet} title="No settlements" body="Settlements appear here once finance drafts them." /> : (
        <Table head={["Driver", "Period", "Amount", "Status", ""]}>
          {rows.data.map((s) => (
            <tr key={s.id} className="border-t border-border">
              <Td>{name(s.driver_user_id)}</Td><Td>{s.period_start} – {s.period_end}</Td><Td>{money(s.amount_cents)}</Td>
              <Td><Badge tone={statusTone(s.status)}>{s.status}</Badge></Td>
              <Td>{fin && s.status === "draft" && <FButton size="sm" variant="outline" onClick={() => approve(s)}>Request approval</FButton>}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
