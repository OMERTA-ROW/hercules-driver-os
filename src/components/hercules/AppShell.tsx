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
} from "lucide-react";
import { VoiceDock } from "./VoiceDock";
import { LoadResetButton } from "./LoadReset";
import { driver } from "@/data/mock";
import { Pill } from "./primitives";

const nav = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/loads", label: "Load Board", icon: Package },
  { to: "/health", label: "Truck Health", icon: Wrench },
  { to: "/financials", label: "Financials", icon: DollarSign },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/driver", label: "Driver", icon: UserCog },
  { to: "/voice", label: "Voice", icon: Mic },
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
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1800px]">
        {/* Left rail — primary nav for a cab-mounted landscape tablet */}
        <aside className="sticky top-0 hidden h-screen w-[112px] shrink-0 flex-col items-center gap-2 border-r border-border bg-card/40 py-4 lg:flex xl:w-[188px] xl:items-stretch xl:px-3">
          <Link to="/" className="mb-4 px-1 text-center xl:text-left">
            <div className="font-display text-2xl font-bold uppercase tracking-[0.14em] text-primary">
              HERC
              <span className="text-foreground">ULES</span>
            </div>
            <div className="label-cap mt-1">by Zeus</div>
          </Link>
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{
                className:
                  "border-primary/60 bg-primary/15 text-primary",
              }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 transition-colors hover:bg-accent hover:text-foreground xl:flex-row xl:justify-start xl:gap-3"
            >
              <n.icon className="h-6 w-6 shrink-0" />
              <span className="font-display text-[0.68rem] uppercase tracking-[0.1em] xl:text-sm">
                {n.label}
              </span>
            </Link>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
            <div className="hazard-stripes h-1 w-full opacity-80" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="lg:hidden">
                  <span className="font-display text-lg font-bold uppercase tracking-[0.14em] text-primary">
                    HERC<span className="text-foreground">ULES</span>
                  </span>
                </div>
                <h1 className="truncate text-2xl font-bold uppercase sm:text-3xl">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right sm:block">
                  <div className="font-display text-sm uppercase tracking-[0.12em]">
                    {driver.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {driver.unit} · {driver.callsign}
                  </div>
                </div>
                <Pill tone="go" className="hidden md:inline-flex">
                  Driver approved mode
                </Pill>
                <LoadResetButton />
              </div>
            </div>
          </header>

          {/* Mobile / portrait nav */}
          <nav className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 lg:hidden">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "border-primary/60 bg-primary/15 text-primary" }}
                inactiveProps={{ className: "border-border text-muted-foreground" }}
                className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 font-display text-xs uppercase tracking-[0.1em]"
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          <main className="px-3 pb-44 pt-4 sm:px-5">{children}</main>
        </div>
      </div>
      <VoiceDock />
    </div>
  );
}
