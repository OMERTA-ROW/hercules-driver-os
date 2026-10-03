import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useFreight } from "@/lib/freight";
import { Directory } from "@/components/freight/Directory";

export const Route = createFileRoute("/freight-customers")({
  head: () => ({ meta: [{ title: "Customers — Hercules Freight OS" }, { name: "description", content: "Shippers, consignees and broker customers." }] }),
  component: () => {
    const { has } = useFreight();
    return (
      <Directory
        table="freight_customers"
        title="Customers"
        icon={Building2}
        canWrite={has("admin", "dispatcher", "broker")}
        cols={[
          { key: "name", label: "Name", required: true },
          { key: "kind", label: "Type", type: "select", options: ["shipper", "consignee", "broker", "other"] },
          { key: "contact_name", label: "Contact" },
          { key: "contact_email", label: "Email", type: "email" },
          { key: "contact_phone", label: "Phone", type: "tel" },
          { key: "notes", label: "Notes", hideInList: true },
        ]}
      />
    );
  },
});
