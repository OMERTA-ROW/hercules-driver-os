import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Gauge,
  Package,
  Wrench,
  DollarSign,
  ShieldAlert,
  UserCog,
  Mic,
  Truck,
  FileText,
  Settings as SettingsIcon,
  Orbit,
  Navigation2,
  Fuel,
  LifeBuoy,
} from "lucide-react";
import { VoiceDock } from "./VoiceDock";
import { LoadResetButton } from "./LoadReset";
import { useVehicles } from "@/lib/live";
import { Pill } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import type { Feature } from "@/data/plans";

const nav = [
  { to: "/", label: "Orb", icon: Orbit, feature: null },
  { to: "/dashboard", label: "Dashboard", icon: Gauge, feature: "dashboard" },
  { to: "/navigation", label: "Navigation", icon: Navigation2, feature: null },
  { to: "/stops", label: "Stops", icon: Fuel, feature: null },
  { to: "/breakdown", label: "Breakdown", icon: LifeBuoy, feature: null },
  { to: "/loads", label: "Load Board", icon: Package, feature: "loads" },
  { to: "/health", label: "Vehicle Health", icon: Wrench, feature: "health" },
  { to: "/financials", label: "Financials", icon: DollarSign, feature: "financials" },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, feature: "alerts" },
  { to: "/driver", label: "Driver", icon: UserCog, feature: "driver" },
  { to: "/fleet", label: "Fleet", icon: Truck, feature: "fleet" },
  { to: "/documents", label: "Docs", icon: FileText, feature: null },
  { to: "/voice", label: "Talk", icon: Mic, feature: "voice" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, feature: null },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { account, can, trialDaysLeft } = useAuth();
  const { data: vehicles } = useVehicles();
  const rig = vehicles?.find((v) => v.active) ?? vehicles?.[0] ?? null;

  const items = nav.filter(
    (n) => !n.feature || !account || can(n.feature as Feature),
  );
  const canReset = !account || can("loadReset");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1800px]">
        {/* Left rail — primary nav for a cab-mounted landscape tablet */}
        <aside className="sticky top-0 hidden h-screen w-[112px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-primary/25 bg-background/80 py-4 shadow-[8px_0_28px_-22px_var(--primary)] backdrop-blur-xl lg:flex xl:w-[188px] xl:items-stretch xl:px-3">
          <Link to="/" className="mb-4 px-1 text-center xl:text-left">
            <div className="font-display text-2xl font-bold uppercase tracking-[0.14em] text-primary">
              HERC
              <span className="text-foreground">ULES</span>
            </div>
            <div className="label-cap mt-1">by Zeus</div>
            <div aria-hidden className="edge-gold mt-3 h-px w-full" />
          </Link>
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{
                className:
                  "border-primary/60 surface-2 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_18%,transparent),0_0_20px_-12px_var(--primary)]",
              }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-colors duration-200 hover:surface-1 hover:text-foreground xl:flex-row xl:justify-start xl:gap-3"
            >
              <n.icon className="h-6 w-6 shrink-0" />
              <span className="font-display text-[0.66rem] font-light uppercase tracking-[0.18em] xl:text-[0.8rem]">
                {n.label}
              </span>
            </Link>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-primary/20 bg-background/95 backdrop-blur-xl shadow-[0_8px_28px_-24px_var(--primary)]">
            <div aria-hidden className="edge-gold h-px w-full shadow-[0_0_14px_-4px_var(--primary)]" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="lg:hidden">
                  <span className="font-display text-lg font-bold uppercase tracking-[0.14em] text-primary">
                    HERC<span className="text-foreground">ULES</span>
                  </span>
                </div>
                <h1 className="truncate font-display text-2xl font-light uppercase tracking-[0.16em] sm:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle size="sm" />
                <div className="hidden text-right sm:block">
                  <div className="font-display text-sm uppercase tracking-[0.12em]">
                    {account?.name ?? "Not signed in"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rig
                      ? [rig.unit_number, rig.label].filter(Boolean).join(" · ")
                      : "No vehicle on file"}
                  </div>
                </div>
                {account ? (
                  account.status === "trial" ? (
                    <Pill tone="warn" className="hidden md:inline-flex">
                      Trial · {trialDaysLeft} days left
                    </Pill>
                  ) : (
                    <Pill tone="go" className="hidden md:inline-flex">
                      Driver approved mode
                    </Pill>
                  )
                ) : (
                  <Link to="/sign-in">
                    <Pill tone="primary">Sign in</Pill>
                  </Link>
                )}
                {canReset ? <LoadResetButton /> : null}
              </div>
            </div>
          </header>

          {/* Mobile / portrait nav */}
          <nav className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 lg:hidden">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "border-primary/60 surface-2 text-primary" }}
                inactiveProps={{ className: "border-primary/20 text-muted-foreground" }}
                className="flex min-h-[46px] shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 font-display text-xs uppercase tracking-[0.12em] transition-colors"
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <main className="rise-in px-3 pb-44 pt-4 sm:px-5 lg:pt-6">{children}</main>
        </div>
      </div>
      <VoiceDock />
    </div>
  );
}
