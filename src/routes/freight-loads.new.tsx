import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FreightRoute } from "@/components/freight/FreightWorkspace";
import { LoadForm } from "@/components/freight/LoadForm";
import { ErrorNote } from "@/components/freight/ui";
import { Panel } from "@/components/hercules/primitives";
import { useFreight } from "@/lib/freight";

export const Route = createFileRoute("/freight-loads/new")({ head: () => ({ meta: [{ title: "New Freight Load — HERCULES" }] }), component: Page });
function Page() { return <FreightRoute title="New freight load"><NewLoad /></FreightRoute>; }
function NewLoad() {
  const { has } = useFreight();
  const navigate = useNavigate();
  if (!has("admin", "dispatcher", "broker")) return <ErrorNote>Your granted company role cannot create loads.</ErrorNote>;
  return <Panel><p className="mb-4 text-sm text-muted-foreground">Save a company draft. Assignment, booking, payment, and dispatch remain separate confirmed actions.</p><LoadForm onSaved={(id) => navigate({ to: "/freight-loads/$id", params: { id } })} /></Panel>;
}
