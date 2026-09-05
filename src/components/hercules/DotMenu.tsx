import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Gauge,
  Package,
  Wrench,
  DollarSign,
  ShieldAlert,
  UserCog,
  Truck,
  FileText,
  Navigation2,
  Fuel,
  Settings as SettingsIcon,
  Mic,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Feature } from "@/data/plans";
import { cn } from "@/lib/utils";

/**
 * The ONLY visible navigation in the voice-first shell: a discreet three-dot
 * control. Everything else is reachable by talking to the orb.
 */

const sections = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge, feature: "dashboard" },
  { to: "/loads", label: "Load Board", icon: Package, feature: "loads" },
  { to: "/health", label: "Truck Health", icon: Wrench, feature: "health" },
  { to: "/financials", label: "Financials", icon: DollarSign, feature: "financials" },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, feature: "alerts" },
  { to: "/driver", label: "Driver Profile", icon: UserCog, feature: "driver" },
  { to: "/navigation", label: "Navigation", icon: Navigation2, feature: null },
  { to: "/stops", label: "Truck Stops", icon: Fuel, feature: null },
  { to: "/documents", label: "Documents", icon: FileText, feature: null },
  { to: "/fleet", label: "Fleet", icon: Truck, feature: "fleet" },
  { to: "/voice", label: "Conversation", icon: Mic, feature: null },
  { to: "/settings", label: "Settings", icon: SettingsIcon, feature: null },
] as const;

export function DotMenu({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const { account, can } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = sections.filter(
    (s) => !s.feature || !account || can(s.feature as Feature),
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 w-12 items-center justify-center gap-[5px] rounded-full transition-opacity hover:opacity-100",
          "opacity-45",
          className,
        )}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-[5px] w-[5px] rounded-full bg-foreground" />
        ))}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 p-5 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full hairline text-foreground/60 transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <nav className="w-full max-w-3xl">
            <p className="tech-label mb-4 text-center">Every section · or just ask</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  onClick={() => setOpen(false)}
                  className="glass flex min-h-[84px] flex-col justify-between p-4 transition-colors hover:border-primary/40"
                >
                  <s.icon className="h-5 w-5 text-primary/80" />
                  <span className="font-display text-sm font-light uppercase tracking-[0.16em]">
                    {s.label}
                  </span>
                </Link>
              ))}
            </div>
            {!account ? (
              <div className="mt-3 flex justify-center gap-2">
                <Link
                  to="/sign-in"
                  onClick={() => setOpen(false)}
                  className="tech-label hairline rounded-full px-5 py-3 text-primary"
                >
                  Sign in
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setOpen(false)}
                  className="tech-label hairline rounded-full px-5 py-3"
                >
                  Plans
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
