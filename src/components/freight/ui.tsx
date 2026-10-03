import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BtnVariant = "primary" | "success" | "outline" | "ghost" | "danger" | "ink";
const btn: Record<BtnVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  success: "bg-go text-primary-foreground hover:bg-go/90 shadow-sm",
  outline: "border border-input bg-card text-foreground hover:bg-accent",
  ghost: "text-foreground hover:bg-accent",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  ink: "bg-ink text-ink-foreground hover:bg-ink/90",
};

export const FButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; busy?: boolean }
>(function FButton({ variant = "primary", size = "md", busy, className, children, disabled, ...p }, ref) {
  return (
    <button
      ref={ref}
      {...p}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4",
        size === "sm" && "h-9 px-3 text-xs",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        btn[variant],
        className,
      )}
    >
      {busy && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
});

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("panel p-5", className)}>{children}</section>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string | undefined; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const tone = {
  neutral: "bg-muted text-foreground border-border",
  ok: "bg-go/10 text-go border-go/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-info/10 text-info border-info/30",
  gold: "bg-primary/10 text-foreground border-primary/50",
};
export type Tone = keyof typeof tone;
export function Badge({ tone: t = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", tone[t])}>
      {children}
    </span>
  );
}

export function statusTone(s: string | null | undefined): Tone {
  switch (s) {
    case "delivered":
    case "accepted":
    case "paid":
    case "executed":
    case "connected":
    case "verified":
    case "reviewed":
    case "stored":
      return "ok";
    case "exception":
    case "cancelled":
    case "rejected":
    case "failed":
    case "declined":
    case "void":
      return "danger";
    case "pending":
    case "draft":
    case "countered":
    case "stale":
    case "unverified":
      return "warn";
    default:
      return "info";
  }
}

export function Empty({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="hfo-grid flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-card text-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}…
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string | undefined; children: ReactNode; required?: boolean | undefined }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
const ctl = "w-full rounded-2xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring";
export const FInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function FInput({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cn(ctl, "h-11", className)} />;
});
export function FSelect({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cn(ctl, "h-11", className)}>
      {children}
    </select>
  );
}
export function FTextarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(ctl, "min-h-24 py-2", className)} />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="bubble-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="panel overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 36" className="h-8 w-7" aria-hidden><path d="M16 1 30 6v11c0 9-6 15-14 18C8 32 2 26 2 17V6z" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.5" /><path d="M16 9v19M10 28 14 9M22 28 18 9" stroke="var(--primary)" strokeWidth="1.4" strokeLinecap="round" /><rect x="11.5" y="13" width="9" height="5" rx="0.8" fill="var(--primary)" /></svg>
      <span className="leading-none">
        <span className={cn("block font-display text-lg font-semibold tracking-tight", light ? "text-foreground" : "text-foreground")}>
          Hercules
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">Freight OS</span>
      </span>
    </span>
  );
}
