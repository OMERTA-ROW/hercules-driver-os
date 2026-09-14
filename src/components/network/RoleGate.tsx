import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Panel, Label, Pill } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/lib/network";
import { roleSpec, roleSpecs, type NetworkRole } from "@/data/roles";
import { cn } from "@/lib/utils";

/**
 * Scaffolded permission gate for the network layers. driver → dispatcher →
 * broker, each a superset of the one below. Mock roles: the view is adopted
 * here rather than issued by a backend.
 */
export function RoleGate({ min, children }: { min: NetworkRole; children: ReactNode }) {
  const { role, setRole, atLeast, ready } = useNetwork();
  const need = roleSpec(min);

  if (!ready) return null;
  if (atLeast(min)) return <>{children}</>;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <Label>Permission scope</Label>
        <Pill tone="warn">{roleSpec(role).label} view</Pill>
      </div>
      <h2 className="mt-1 text-xl font-bold uppercase">{need.label} layer</h2>
      <p className="mt-1 text-sm text-muted-foreground">{need.job}</p>
      <p className="mt-2 text-sm">
        Your current scope is <strong>{roleSpec(role).label}</strong>. The{" "}
        {need.label.toLowerCase()} layer sits above it, so it stays closed until the scope is
        widened.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="bubble-bar bubble-scroll">
        {roleSpecs.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={role === r.id}
            onClick={() => setRole(r.id)}
            className={cn(
              "min-h-[76px] rounded-lg border p-3 text-left transition-colors",
              role === r.id
                ? "border-primary/60 bg-primary/12"
                : "border-border bg-card/50 hover:bg-accent",
            )}
          >
            <span className="font-display text-sm uppercase tracking-[0.12em]">{r.label}</span>
            <p className="mt-1 text-xs text-muted-foreground">{r.who}</p>
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-3 w-full gap-2" onClick={() => setRole(min)}>
        <ShieldCheck className="h-4 w-4" /> Open the {need.label.toLowerCase()} view
      </Button>
    </Panel>
  );
}

/** Compact scope strip shown at the top of a network view. */
export function ScopeStrip() {
  const { role, setRole } = useNetwork();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Label>Scope</Label>
      <div className="bubble-bar bubble-scroll">
        {roleSpecs.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={role === r.id}
          onClick={() => setRole(r.id)}
          className={cn("bubble-tab", role === r.id && "bubble-tab-on")}
        >
          {r.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        Each layer holds everything the one below it holds.
      </span>
    </div>
  );
}
