import { useState, type ReactNode } from "react";
import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import {
  BarChart3, Bell, Boxes, Building2, ClipboardList, FileText, Gauge, Handshake, LayoutDashboard, LogOut, Map, Menu,
  MessageSquare, Plug, Receipt, Route as RouteIcon, Settings, ShieldCheck, Sparkles, Truck, Users, Wallet, Warehouse, X,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useFreight, type FreightRole } from "@/lib/freight";
import { Empty, Logo } from "./ui";
import { cn } from "@/lib/utils";

type Nav = { to: NonNullable<LinkProps["to"]>; label: string; icon: LucideIcon; roles: FreightRole[] | null; group: string };
const ALL: FreightRole[] | null = null;
export const NAV: Nav[] = [
  { to: "/dashboard", label: "Command center", icon: LayoutDashboard, roles: ["admin", "dispatcher", "broker", "fleet_owner", "finance", "shipper"], group: "Operate" },
  { to: "/driver", label: "My loads", icon: Truck, roles: ["driver"], group: "Operate" },
  { to: "/loads", label: "Loads", icon: ClipboardList, roles: ["admin", "dispatcher", "broker", "fleet_owner", "finance"], group: "Operate" },
  { to: "/dispatch", label: "Dispatch board", icon: Gauge, roles: ["admin", "dispatcher"], group: "Operate" },
  { to: "/trips", label: "Trips", icon: RouteIcon, roles: ["admin", "dispatcher", "fleet_owner"], group: "Operate" },
  { to: "/tracking", label: "Tracking", icon: Map, roles: ["admin", "dispatcher", "broker", "fleet_owner"], group: "Operate" },
  { to: "/broker", label: "Brokerage", icon: Handshake, roles: ["admin", "broker"], group: "Operate" },
  { to: "/shipper", label: "Shipments", icon: Warehouse, roles: ["shipper"], group: "Operate" },
  { to: "/messages", label: "Messages", icon: MessageSquare, roles: ALL, group: "Operate" },
  { to: "/documents", label: "Documents", icon: FileText, roles: ALL, group: "Operate" },
  { to: "/drivers", label: "Drivers", icon: Users, roles: ["admin", "dispatcher", "fleet_owner"], group: "Fleet" },
  { to: "/equipment", label: "Equipment", icon: Boxes, roles: ["admin", "dispatcher", "fleet_owner"], group: "Fleet" },
  { to: "/fleet", label: "Fleet overview", icon: Truck, roles: ["admin", "fleet_owner"], group: "Fleet" },
  { to: "/customers", label: "Customers", icon: Building2, roles: ["admin", "dispatcher", "broker", "fleet_owner", "finance"], group: "Network" },
  { to: "/carriers", label: "Carriers", icon: ShieldCheck, roles: ["admin", "dispatcher", "broker", "finance"], group: "Network" },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: ["admin", "finance", "broker", "shipper"], group: "Finance" },
  { to: "/settlements", label: "Settlements", icon: Wallet, roles: ["admin", "finance", "fleet_owner", "driver"], group: "Finance" },
  { to: "/automation", label: "Automation & approvals", icon: Sparkles, roles: ["admin", "dispatcher", "broker", "fleet_owner", "finance"], group: "Control" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "dispatcher", "broker", "fleet_owner", "finance"], group: "Control" },
  { to: "/integrations", label: "Integrations", icon: Plug, roles: ["admin"], group: "Control" },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"], group: "Control" },
  { to: "/settings", label: "Settings", icon: Settings, roles: ALL, group: "Control" },
];

export function navFor(role: FreightRole | null) {
  return NAV.filter((n) => n.roles === null || (role && n.roles.includes(role)));
}

function NavList({ role, onPick }: { role: FreightRole | null; onPick?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = navFor(role);
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Main" className="space-y-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">{g}</p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const on = path === i.to || path.startsWith(i.to + "/");
                return (
                  <li key={i.to}>
                    <Link
                      to={i.to}
                      onClick={onPick}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-line hover:text-ink-foreground",
                        on && "bg-ink-line text-ink-foreground shadow-[inset_2px_0_0_var(--gold)]",
                      )}
                    >
                      <i.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Switchers({ dark }: { dark?: boolean }) {
  const { companies, company, role, roles, setCompany, setRole } = useFreight();
  const cls = cn(
    "h-10 rounded-lg border px-2 text-sm font-medium",
    dark ? "border-ink-line bg-ink text-ink-foreground" : "border-input bg-card text-foreground",
  );
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="hfo-co">Company</label>
      <select id="hfo-co" className={cls} value={company?.id ?? ""} onChange={(e) => setCompany(e.target.value)}>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hfo-role">Role</label>
      <select id="hfo-role" className={cls} value={role ?? ""} onChange={(e) => setRole(e.target.value as FreightRole)}>
        {roles.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
    </div>
  );
}

function Bellish() {
  const { userId, company } = useFreight();
  const q = useQuery({
    queryKey: ["f", "notif", company?.id],
    enabled: !!userId && !!company,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("freight_notifications")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company!.id)
        .is("read_at", null);
      return count ?? 0;
    },
  });
  return (
    <Link to="/messages" className="relative grid h-10 w-10 place-items-center rounded-lg border border-input bg-card" aria-label={`Notifications${q.data ? `, ${q.data} unread` : ""}`}>
      <Bell className="h-4 w-4" />
      {!!q.data && <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{q.data}</span>}
    </Link>
  );
}

export function FreightShell({ children }: { children: ReactNode }) {
  const { role, company, email } = useFreight();
  const [open, setOpen] = useState(false);
  return (
    <div className="hfo flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-ink px-3 py-5 lg:flex">
        <Link to="/dashboard" className="mb-6 px-2"><Logo light /></Link>
        <NavList role={role} />
        <div className="mt-auto border-t border-ink-line pt-4">
          <p className="truncate px-2 text-xs text-ink-muted">{email}</p>
          <Link to="/logout" className="mt-2 flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-ink-muted hover:bg-ink-line hover:text-ink-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Link>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-ink p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo light />
              <button className="grid h-10 w-10 place-items-center rounded-lg text-ink-foreground" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
            </div>
            <div className="mb-5"><Switchers dark /></div>
            <NavList role={role} onPick={() => setOpen(false)} />
            <Link to="/logout" className="mt-6 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-ink-muted"><LogOut className="h-4 w-4" /> Sign out</Link>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="hfo-trim sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="grid h-11 w-11 place-items-center rounded-lg border border-input lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <span className="lg:hidden"><Logo /></span>
            <p className="hidden text-sm text-muted-foreground lg:block">
              <span className="font-semibold text-foreground">{company?.name}</span> · {role ? ROLE_LABEL[role] : ""} workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><Switchers /></div>
            <Bellish />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

/** Interface-level guard. Data is still enforced by the database for every role. */
export function Need({ roles, children }: { roles: FreightRole[]; children: ReactNode }) {
  const { role } = useFreight();
  if (role && roles.includes(role)) return <>{children}</>;
  return (
    <Empty
      icon={ShieldCheck}
      title="Not part of this workspace"
      body={`This page is for ${roles.map((r) => ROLE_LABEL[r]).join(", ")}. Your company admin can grant roles. Choosing a different view never grants access.`}
    />
  );
}
