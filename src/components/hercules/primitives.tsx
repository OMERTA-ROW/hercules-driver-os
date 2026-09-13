import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one surface every screen is built from: layered dark glass, a hairline
 * edge and a crisp gold top rule. `flush` drops the padding for maps and other
 * edge-to-edge content; `plain` drops the gold rule for quiet nested cards.
 */
export function Panel({
  className,
  children,
  flush = false,
  plain = false,
}: {
  className?: string | undefined;
  children: ReactNode;
  flush?: boolean;
  plain?: boolean;
}) {
  return (
    <div className={cn("panel relative overflow-hidden", flush ? "" : "p-4 sm:p-5", className)}>
      {plain ? null : (
        <div aria-hidden className="edge-gold pointer-events-none absolute inset-x-0 top-0 h-px" />
      )}
      {children}
    </div>
  );
}

/** A nested block inside a panel — one step lighter, no competing border. */
export function Slab({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn("surface-1 hairline rounded-lg p-3 sm:p-4", className)}>{children}</div>
  );
}

export function PanelTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="h-6 w-px bg-primary/70 shadow-[0_0_10px_var(--primary)]" />
        <h2 className="truncate font-display text-lg font-light uppercase tracking-[0.14em] sm:text-xl">
          {children}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cn("label-cap", className)}>{children}</div>;
}

export function Metric({
  value,
  unit,
  tone = "default",
  className,
}: {
  value: ReactNode;
  unit?: string | undefined;
  tone?: "default" | "primary" | "go" | "warn" | "alert" | "info" | undefined;
  className?: string | undefined;
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    primary: "text-primary",
    go: "text-go",
    warn: "text-warn",
    alert: "text-destructive",
    info: "text-info",
  };
  return (
    <div className={cn("metric flex items-baseline gap-1.5 font-bold", tones[tone], className)}>
      <span className="text-4xl sm:text-5xl">{value}</span>
      {unit ? (
        <span className="text-sm font-semibold uppercase tracking-wider opacity-70">{unit}</span>
      ) : null}
    </div>
  );
}

const statusTone = {
  ok: "border-go/40 bg-go/12 text-go",
  go: "border-go/40 bg-go/12 text-go",
  watch: "border-warn/45 bg-warn/12 text-warn",
  warn: "border-warn/45 bg-warn/12 text-warn",
  alert: "border-destructive/50 bg-destructive/15 text-destructive",
  info: "border-info/45 bg-info/12 text-info",
  neutral: "border-primary/25 surface-2 text-muted-foreground",
  primary: "border-primary/50 bg-primary/12 text-primary",
} as const;

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof statusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-display text-[0.7rem] font-medium uppercase tracking-[0.12em]",
        statusTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Bar({
  pct,
  tone = "primary",
  className,
}: {
  pct: number;
  tone?: "primary" | "go" | "warn" | "alert" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary",
    go: "bg-go",
    warn: "bg-warn",
    alert: "bg-destructive",
    info: "bg-info",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function DriverApprovedNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {children ??
        "HERCULES proposes. You decide. Nothing is booked, committed, or logged without your explicit approval."}
    </p>
  );
}

/**
 * Truthful source label. Anything on screen that is NOT coming from a live,
 * connected service must say so in plain words — no implied verification.
 */
export function NotConnectedNote({ what }: { what: string }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Not connected yet: {what} is shown as a worked example, not live data. Treat it as a preview of the
      screen, not as fact — check the real source before you act on it.
    </p>
  );
}

/**
 * Honest empty state. HERCULES never fills a gap with invented numbers — if a
 * source isn't connected yet, it says so and says what to do about it.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    /* An empty screen still has to look finished — grid, edge and a clear next
       step, never a blank hole or invented numbers. */
    <div className="corner-ticks inner-grid surface-1 hairline relative overflow-hidden rounded-xl p-6 text-center sm:p-8">
      <div aria-hidden className="edge-gold pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="tech-label">Nothing here yet</div>
      <div className="mt-1 font-display text-lg font-light uppercase tracking-[0.14em] text-primary sm:text-xl">
        {title}
      </div>
      {children ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function money2(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function hm(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
