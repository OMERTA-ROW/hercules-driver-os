import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useFreight } from "@/lib/freight";
import { Badge, Card, Field, FButton, FInput, PageHeader } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Hercules Freight OS" }, { name: "description", content: "Your account and workspaces." }] }),
  component: Settings,
});

function Settings() {
  const { email, companies, company, setCompany } = useFreight();
  const [pw, setPw] = useState("");
  const save = async () => {
    if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    error ? toast.error("Couldn't change your password.") : toast.success("Password changed.");
    setPw("");
  };
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          <div className="mt-4 flex gap-2"><Field label="New password"><FInput type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field><div className="flex items-end"><FButton variant="outline" onClick={save}>Change</FButton></div></div>
          <Link to="/logout" className="mt-6 inline-block"><FButton variant="danger">Sign out</FButton></Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <p className="text-sm text-muted-foreground">Roles are given by each company's admin.</p>
          <ul className="mt-3 space-y-2">
            {companies.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div><p className="font-medium">{c.name}</p><div className="mt-1 flex flex-wrap gap-1">{c.roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)}</div></div>
                {c.id === company?.id ? <Badge tone="ok">Current</Badge> : <FButton size="sm" variant="outline" onClick={() => setCompany(c.id)}>Switch</FButton>}
              </li>
            ))}
          </ul>
          <Link to="/onboarding" className="mt-4 inline-block"><FButton variant="outline">Create or join another company</FButton></Link>
        </Card>
      </div>
    </>
  );
}
