import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { money, rpc, useFreight, useLoads, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Badge, Empty, ErrorNote, FButton, Loading, PageHeader, statusTone, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/freight-invoices")({
  head: () => ({ meta: [{ title: "Invoices — Hercules Freight OS" }, { name: "description", content: "Customer invoices and payment records." }] }),
  component: Invoices,
});

type Inv = { id: string; number: string; load_id: string; amount_cents: number; status: string; due_on: string | null; created_at: string };

function Invoices() {
  const { company, has } = useFreight();
  const rows = useRows<Inv>("freight_invoices", company?.id);
  const loads = useLoads(company?.id);
  const inv = useInvalidate();
  if (rows.isLoading) return <Loading />;
  if (rows.error) return <ErrorNote>Your role can't view invoices.</ErrorNote>;
  const ask = async (i: Inv, action: "invoice" | "payment") => {
    const ref = action === "payment" ? window.prompt("Payment reference (check #, ACH trace)") : null;
    if (action === "payment" && !ref) return;
    const r = await rpc("freight_approval_request", {
      _company: company!.id, _action: action, _load: null,
      _payload: action === "invoice" ? { invoice_id: i.id } : { invoice_id: i.id, amount_cents: i.amount_cents, method: "manual_other", reference: ref },
      _reason: action === "invoice" ? `Approve invoice ${i.number}` : `Record payment for ${i.number}`, _why: "Finance actions need a second person",
    });
    r.ok ? toast.success("Sent for approval.") : toast.error(r.message);
    void inv();
  };
  const fin = has("admin", "finance");
  return (
    <>
      <PageHeader title="Invoices" sub="Draft invoices from a delivered load's page. Payments are recorded manually — no payment provider is connected, so no money moves from here." />
      {!rows.data?.length ? <Empty icon={Receipt} title="No invoices yet" body="Invoices appear after a delivered load is invoiced." /> : (
        <Table head={["Invoice", "Load", "Amount", "Due", "Status", ""]}>
          {rows.data.map((i) => {
            const l = loads.data?.find((x) => x.id === i.load_id);
            return (
              <tr key={i.id} className="border-t border-border">
                <Td>{i.number}</Td>
                <Td>{l ? <Link to="/freight-loads/$id" params={{ id: l.id }} className="text-primary underline">{l.reference}</Link> : "—"}</Td>
                <Td>{money(i.amount_cents)}</Td><Td>{i.due_on ?? when(i.created_at)}</Td>
                <Td><Badge tone={statusTone(i.status)}>{i.status}</Badge></Td>
                <Td>{fin && i.status === "draft" && <FButton size="sm" variant="outline" onClick={() => ask(i, "invoice")}>Request approval</FButton>}{fin && ["approved", "sent"].includes(i.status) && <FButton size="sm" variant="outline" onClick={() => ask(i, "payment")}>Record payment</FButton>}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
