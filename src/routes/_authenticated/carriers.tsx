import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFreight } from "@/lib/freight";
import { useInvalidate } from "@/lib/freight-data";
import { Directory } from "@/components/freight/Directory";
import { FButton } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/carriers")({
  head: () => ({ meta: [{ title: "Carriers — Hercules Freight OS" }, { name: "description", content: "Carrier directory and verification." }] }),
  component: Carriers,
});

function Carriers() {
  const { has } = useFreight();
  const inv = useInvalidate();
  const canWrite = has("admin", "broker");
  const mark = async (id: string, s: string) => {
    const { error } = await supabase.from("freight_carriers").update({ verification_status: s }).eq("id", id);
    error ? toast.error("Couldn't update.") : toast.success("Updated.");
    void inv();
  };
  return (
    <Directory
      table="freight_carriers"
      title="Carriers"
      sub="Automatic FMCSA verification isn't connected. Check MC/DOT authority and insurance yourself, then mark the carrier verified."
      icon={ShieldCheck}
      canWrite={canWrite}
      cols={[
        { key: "name", label: "Name", required: true },
        { key: "mc_number", label: "MC #" },
        { key: "dot_number", label: "DOT #" },
        { key: "insurance_expires", label: "Insurance expires", type: "date" },
        { key: "contact_email", label: "Email", type: "email" },
        { key: "contact_phone", label: "Phone", type: "tel" },
        { key: "verification_status", label: "Verification", hideInList: false, type: "select", options: ["unverified"] },
      ]}
      extra={(r) => canWrite && (r["verification_status"] === "verified"
        ? <FButton size="sm" variant="ghost" onClick={() => mark(String(r["id"]), "unverified")}>Unverify</FButton>
        : <FButton size="sm" variant="outline" onClick={() => mark(String(r["id"]), "verified")}>Mark verified</FButton>)}
    />
  );
}
