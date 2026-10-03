import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useFreight } from "@/lib/freight";
import { LoadForm } from "@/components/freight/LoadForm";
import { Card, ErrorNote, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/loads/new")({
  head: () => ({ meta: [{ title: "New load — Hercules Freight OS" }, { name: "description", content: "Create a load." }] }),
  component: NewLoad,
});

function NewLoad() {
  const { has } = useFreight();
  const navigate = useNavigate();
  if (!has("admin", "dispatcher", "broker")) return <ErrorNote>Your role can't create loads.</ErrorNote>;
  return (
    <>
      <PageHeader title="New load" sub="Drafts can be incomplete. Every required field must be filled before assigning a driver." />
      <Card><LoadForm onSaved={(id) => navigate({ to: "/loads/$id", params: { id } })} /></Card>
    </>
  );
}
