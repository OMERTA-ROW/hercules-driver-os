import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OP_LABEL, STATUS_LABEL, useFreight, when, type LoadRow } from "@/lib/freight";
import { LoadDocs } from "@/components/freight/LoadDocs";
import { Badge, Card, Empty, ErrorNote, Loading, PageHeader, statusTone } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/shipper")({
  head: () => ({ meta: [{ title: "Shipments — Hercules Freight OS" }, { name: "description", content: "Track your shipments and download PODs." }] }),
  component: Shipper,
});

function Shipper() {
  const { company, has } = useFreight();
  // Loads carriers have linked to this shipper company; RLS returns only those.
  const q = useQuery({
    queryKey: ["f", "shipper-loads", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("freight_loads").select("*").eq("shipper_company_id", company!.id).order("pickup_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as LoadRow[];
    },
  });
  if (!has("shipper", "admin")) return <ErrorNote>Shipments are for shipper accounts.</ErrorNote>;
  if (q.isLoading) return <Loading />;
  const loads = q.data ?? [];
  return (
    <>
      <PageHeader title="Shipments" sub="Shipments your carriers or brokers have linked to your company." />
      {loads.length === 0 ? <Empty icon={Package} title="No shipments yet" body="When a carrier or broker links a load to your company, you'll see its progress and proof of delivery here." /> :
        loads.map((l) => (
          <Card key={l.id} className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{l.reference}</p><p className="text-sm text-muted-foreground">{l.origin} → {l.destination} · Delivery {when(l.delivery_at)}</p></div>
              <div className="flex gap-1"><Badge tone={statusTone(l.status)}>{STATUS_LABEL[l.status]}</Badge>{l.op_status && <Badge tone={statusTone(l.op_status)}>{OP_LABEL[l.op_status]}</Badge>}</div>
            </div>
            <div className="mt-3"><LoadDocs companyId={l.company_id} loadId={l.id} canUpload={false} /></div>
          </Card>
        ))}
    </>
  );
}
