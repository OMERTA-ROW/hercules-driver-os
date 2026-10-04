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

  const items = nav.filter((n) => !n.feature || !account || can(n.feature as Feature));
  const canReset = !account || can("loadReset");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1800px]">
        {/* Left rail — a floating bubble rail for a cab-mounted landscape tablet */}
        <aside className="sticky top-0 hidden h-screen w-[124px] shrink-0 flex-col gap-3 overflow-y-auto px-2 py-4 lg:flex xl:w-[204px] xl:px-4">
          <Link to="/" className="px-2 text-center xl:text-left">
            <div className="font-display text-lg font-bold uppercase tracking-[0.08em] text-primary xl:text-2xl xl:tracking-[0.14em]">
              HERC
              <span className="text-foreground">ULES</span>
            </div>
            <div className="label-cap mt-1">by Zeus</div>
          </Link>
          <div className="bubble-bar !flex-col !items-stretch !rounded-[2rem] !p-2">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bubble-tab-on" }}
                className="bubble-tab min-h-[60px] !flex-col !gap-1 !px-2 xl:!flex-row xl:!justify-start xl:!gap-3 xl:!px-4"
              >
                <n.icon className="h-6 w-6 shrink-0" />
                <span className="text-[0.62rem] xl:text-[0.76rem]">{n.label}</span>
              </Link>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background">
            <div
              aria-hidden
              className="edge-gold h-px w-full"
            />
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
                  <Link to="/sign-in" className="inline-flex min-h-11 items-center rounded-full">
                    <Pill tone="primary">Sign in</Pill>
                  </Link>
                )}
                {canReset ? <LoadResetButton /> : null}
              </div>
            </div>
          </header>

          {/* Phone / portrait: a floating bubble dock that clears the voice orb */}
          <nav
            aria-label="Sections"
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+6.75rem)] z-40 px-3 lg:hidden"
          >
            <div className="bubble-bar bubble-scroll pointer-events-auto mx-auto w-full max-w-[52rem]">
              {items.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  activeProps={{ className: "bubble-tab-on" }}
                  className="bubble-tab"
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>

          <main className="rise-in px-3 pb-[16.5rem] pt-4 sm:px-5 lg:pb-44 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
      <VoiceDock />
    </div>
  );
}
