import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Building2, CheckSquare, ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { DriverApprovedNote, EmptyState, Panel, Pill, SegTabs } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { FreightProvider, ROLE_LABEL, useFreight, type FreightRole } from "@/lib/freight";

const tabs = [
  { to: "/freight", label: "Overview", icon: ClipboardList },
  { to: "/freight-control", label: "Approvals", icon: CheckSquare },
  { to: "/freight-admin", label: "Admin", icon: ShieldCheck },
  { to: "/freight-workspace", label: "Workspace", icon: Building2 },
] as const;

export function FreightRoute({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppShell title={title} subtitle="Company operations · server-granted access">
      <FreightProvider><FreightGate>{children}</FreightGate></FreightProvider>
    </AppShell>
  );
}

function FreightGate({ children }: { children: ReactNode }) {
  const { ready, userId, companies, company, role, roles, setCompany, setRole } = useFreight();
  if (!ready) return <Panel><p role="status" className="text-sm text-muted-foreground">Opening your freight workspace…</p></Panel>;
  if (!userId) return (
    <EmptyState title="Sign in to open freight operations" action={<Button asChild><Link to="/sign-in">Sign in</Link></Button>}>
      Company roles and freight records are granted and filtered by the server.
    </EmptyState>
  );
  if (!companies.length) return (
    <EmptyState title="Create or join a workspace" action={<Button asChild><Link to="/freight-workspace">Set up workspace</Link></Button>}>
      Start a company workspace, or use an invitation from its admin.
    </EmptyState>
  );
  return (
    <div className="space-y-4">
      <Panel plain className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-cap">Freight workspace</p>
            <p className="mt-1 font-display text-lg uppercase tracking-[0.1em]">{company?.name}</p>
          </div>
          {role ? <Pill tone="info">{ROLE_LABEL[role]}</Pill> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {companies.length > 1 ? <select aria-label="Company" value={company?.id ?? ""} onChange={(e) => setCompany(e.target.value)} className="h-11 rounded-full border border-input bg-card px-4 text-sm">{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select> : null}
          {roles.length > 1 ? <select aria-label="Role view" value={role ?? ""} onChange={(e) => setRole(e.target.value as FreightRole)} className="h-11 rounded-full border border-input bg-card px-4 text-sm">{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select> : null}
        </div>
        <nav aria-label="Freight operations" className="bubble-scroll flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => <Button key={tab.to} asChild variant="outline" size="sm" className="shrink-0 rounded-full"><Link to={tab.to}><tab.icon />{tab.label}</Link></Button>)}
        </nav>
        <DriverApprovedNote />
      </Panel>
      {children}
    </div>
  );
}