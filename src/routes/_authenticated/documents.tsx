import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { rpc, signedUrl, useFreight, useLoads, when } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import type { DocRow } from "@/components/freight/LoadDocs";
import { Badge, Empty, FButton, Loading, PageHeader, statusTone, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Hercules Freight OS" }, { name: "description", content: "Load, driver and equipment documents." }] }),
  component: Docs,
});

function Docs() {
  const { company, has } = useFreight();
  const docs = useRows<DocRow & { expires_on: string | null }>("freight_documents", company?.id);
  const loads = useLoads(company?.id);
  const inv = useInvalidate();
  if (docs.isLoading) return <Loading />;
  const list = (docs.data ?? []).filter((d) => d.status !== "pending");
  const review = async (d: DocRow, ok: boolean) => {
    const r = await rpc("freight_doc_review", { _doc: d.id, _approve: ok, _note: null });
    r.ok ? toast.success(ok ? "Marked reviewed." : "Rejected.") : toast.error(r.message);
    void inv();
  };
  const open = async (d: DocRow) => {
    const u = await signedUrl(d.storage_path);
    u ? window.open(u, "_blank", "noopener") : toast.error("You don't have access to that file.");
  };
  return (
    <>
      <PageHeader title="Documents" sub="Upload documents from a load's page. Files are private; downloads use short-lived links." />
      <p className="mb-4 text-sm text-muted-foreground">Automatic text extraction isn't configured, so documents are reviewed by a person.</p>
      {list.length === 0 ? <Empty icon={FileText} title="No documents" body="Rate confirmations, BOLs, PODs and receipts will collect here." /> : (
        <Table head={["File", "Type", "Load", "Uploaded", "Status", ""]}>
          {list.map((d) => {
            const l = loads.data?.find((x) => x.id === d.load_id);
            return (
              <tr key={d.id} className="border-t border-border">
                <Td>{d.file_name}</Td><Td>{d.kind.replace(/_/g, " ")}</Td>
                <Td>{l ? <Link to="/loads/$id" params={{ id: l.id }} className="text-primary underline">{l.reference}</Link> : "—"}</Td>
                <Td>{when(d.created_at)}</Td><Td><Badge tone={statusTone(d.status)}>{d.status}</Badge></Td>
                <Td className="whitespace-nowrap">
                  <FButton size="sm" variant="outline" onClick={() => open(d)}>Open</FButton>
                  {has("admin", "dispatcher") && d.status === "stored" && <><FButton size="sm" variant="ghost" onClick={() => review(d, true)}>Approve</FButton><FButton size="sm" variant="ghost" onClick={() => review(d, false)}>Reject</FButton></>}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
