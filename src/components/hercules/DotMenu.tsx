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
  LifeBuoy,
  Settings as SettingsIcon,
  Mic,
  ShoppingBag,
  ShoppingBasket,
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
  { to: "/breakdown", label: "Breakdown Assist", icon: LifeBuoy, feature: null },
  { to: "/documents", label: "Documents", icon: FileText, feature: null },
  { to: "/supply", label: "Delivery & Supply", icon: ShoppingBasket, feature: null },
  { to: "/store", label: "Store", icon: ShoppingBag, feature: null },
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
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] cursor-default bg-background/30"
          />
          <nav className="glass fixed right-4 top-18 z-[80] flex max-h-[min(72vh,640px)] w-[min(calc(100vw-2rem),420px)] flex-col overflow-hidden shadow-[0_0_34px_-12px_color-mix(in_oklab,var(--primary)_55%,var(--violet))]">
            <div className="flex shrink-0 items-center justify-between border-b border-primary/25 px-4 py-3">
              <p className="tech-label text-primary">Every section · or just ask</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hairline text-foreground/70 transition-colors hover:border-primary/60 hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-3">
              {items.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[76px] flex-col justify-between rounded-lg border border-primary/20 bg-background p-3 transition-all hover:border-primary/60 hover:bg-primary/8 hover:shadow-[0_0_18px_-8px_var(--primary)]"
                >
                  <s.icon className="h-5 w-5 text-primary/80" />
                  <span className="font-display text-sm font-light uppercase tracking-[0.16em]">
                    {s.label}
                  </span>
                </Link>
              ))}
            </div>
            {!account ? (
              <div className="flex shrink-0 justify-center gap-2 border-t border-primary/20 p-3">
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
        </>
      ) : null}
    </>
  );
}
