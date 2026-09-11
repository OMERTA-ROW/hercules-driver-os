import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bot, Check, Radar, Truck } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  DriverApprovedNote,
  money,
  money2,
  hm,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { NetworkProvider, useNetwork } from "@/lib/network";
import { RoleGate, ScopeStrip } from "@/components/network/RoleGate";
import {
  exceptionLabel,
  projectToBox,
  truckStatusLabel,
  type NetworkException,
  type TruckStatus,
} from "@/data/network";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Watch — HERCULES" },
      {
        name: "description",
        content:
          "Hands-off dispatch for 100+ vehicle fleets: fleet-wide map, loads HERCULES matched and routed with its reasoning shown, and an exceptions-only queue with override.",
      },
      { property: "og:title", content: "Dispatch Watch — HERCULES" },
      {
        property: "og:description",
        content: "HERCULES dispatches. The dispatcher supervises and handles exceptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DispatchRoute,
});

function DispatchRoute() {
  return (
    <NetworkProvider>
      <AppShell
        title="Dispatch Watch"
        subtitle="HERCULES dispatches — you supervise and handle exceptions"
      >
        <ScopeStrip />
        <RoleGate min="dispatcher">
          <DispatchView />
        </RoleGate>
      </AppShell>
    </NetworkProvider>
  );
}

const statusTone: Record<TruckStatus, string> = {
  rolling: "text-go",
  loading: "text-info",
  unloading: "text-info",
  detained: "text-warn",
  break: "text-muted-foreground",
  reset: "text-muted-foreground",
  empty: "text-primary",
  down: "text-destructive",
};

const statusDot: Record<TruckStatus, string> = {
  rolling: "bg-go",
  loading: "bg-info",
  unloading: "bg-info",
  detained: "bg-warn",
  break: "bg-muted-foreground",
  reset: "bg-muted-foreground",
  empty: "bg-primary",
  down: "bg-destructive",
};

function DispatchView() {
  const { trucks, matched, exceptions, overrides, intervene, clearException } = useNetwork();
  const [selected, setSelected] = useState<string | null>(trucks[0]?.id ?? null);
  const [openReasoning, setOpenReasoning] = useState<string | null>(matched[0]?.id ?? null);
  const [confirm, setConfirm] = useState<NetworkException | null>(null);

  const rolling = trucks.filter((t) => t.status === "rolling").length;
  const critical = exceptions.filter((x) => x.severity === "critical").length;
  const autoRouted = matched.length;
  const truck = trucks.find((t) => t.id === selected) ?? null;

  return (
    <>
      {/* THE POINT OF THE LAYER */}
      <Panel className="border-primary/35">
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm">
            <strong className="uppercase tracking-[0.1em] text-primary">Hands off.</strong>{" "}
            HERCULES matched and routed all {autoRouted} live loads on its own, and every driver
            approved their own run. There is no assignment desk here — you watch the fleet and step
            in on the {exceptions.length} open exception{exceptions.length === 1 ? "" : "s"}.
          </p>
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelTitle right={<Pill tone="go">Live</Pill>}>Fleet moving</PanelTitle>
          <Metric value={`${rolling}/${trucks.length}`} unit="rolling" tone="go" />
          <p className="mt-3 text-xs text-muted-foreground">
            Every unit carries its active vehicle profile — routing follows that profile, not a
            generic truck.
          </p>
        </Panel>
        <Panel>
          <PanelTitle right={<Pill tone="primary">Automatic</Pill>}>Matched by HERCULES</PanelTitle>
          <Metric value={autoRouted} unit="loads" tone="primary" />
          <p className="mt-3 text-xs text-muted-foreground">
            Matched, priced, routed and read out to the driver. Reasoning shown on every one.
          </p>
        </Panel>
        <Panel>
          <PanelTitle right={<Pill tone={critical ? "alert" : "go"}>Queue</Pill>}>
            Exceptions
          </PanelTitle>
          <Metric
            value={exceptions.length}
            unit={critical ? `${critical} critical` : "clear"}
            tone={critical ? "alert" : "go"}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Breakdowns, detention, hours running out, a load falling through, a hazard blocking a
            route. Nothing else reaches you.
          </p>
        </Panel>
      </div>

      {/* FLEET-WIDE MAP */}
      <Panel className="mt-3">
        <PanelTitle
          right={
            <Pill tone="info">
              <Radar className="h-3.5 w-3.5" /> {trucks.length} units
            </Pill>
          }
        >
          Fleet-wide map
        </PanelTitle>
        <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-black">
            {/* corridor guide */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M 52 100 L 55 62 L 62 30 L 66 0" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="0.9" fill="none" />
              <path d="M 0 74 L 100 66" stroke="hsl(var(--info))" strokeOpacity="0.28" strokeWidth="0.5" fill="none" />
            </svg>
            {trucks.map((t) => {
              const { x, y } = projectToBox(t.lat, t.lng);
              const active = t.id === selected;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`${t.unit} — ${truckStatusLabel[t.status]}`}
                  onClick={() => setSelected(t.id)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all",
                    active
                      ? "z-10 border-primary bg-primary/25 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.5)]"
                      : "border-border/80 bg-black/80 text-foreground/85 hover:border-primary/50",
                  )}
                >
                  <span className={cn("mr-1 inline-block h-2 w-2 rounded-full", statusDot[t.status])} />
                  {t.unit}
                </button>
              );
            })}
          </div>

          {/* SELECTED UNIT */}
          <div className="space-y-2">
            {truck ? (
              <div className="rounded-lg border border-primary/35 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg uppercase tracking-[0.1em] text-primary">
                    {truck.unit}
                  </span>
                  <Pill tone="neutral">{truck.driver}</Pill>
                </div>
                <p className={cn("mt-1 text-sm font-semibold", statusTone[truck.status])}>
                  {truckStatusLabel[truck.status]}
                  {truck.speedMph ? ` · ${truck.speedMph} mph` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{truck.place}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label>Active profile</Label>
                    <p className="mt-0.5">{truck.profile.label}</p>
                  </div>
                  <div>
                    <Label>Drive clock</Label>
                    <p className="mt-0.5">{hm(truck.hosMin)}</p>
                  </div>
                </div>
                {truck.loadId ? (
                  <p className="mt-2 text-xs">
                    Under load <span className="text-primary">{truck.loadId}</span> — routed by
                    HERCULES.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-primary">
                    Empty — HERCULES is searching this market.
                  </p>
                )}
              </div>
            ) : null}

            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {trucks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "flex min-h-[52px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                    t.id === selected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-card/50 hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", statusDot[t.status])} />
                    <span className="font-semibold">{t.unit}</span>
                    <span className="text-muted-foreground">{t.profile.label}</span>
                  </span>
                  <span className={statusTone[t.status]}>{truckStatusLabel[t.status]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* MACHINE-MATCHED LOADS WITH REASONING */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="primary">Routed automatically</Pill>}>
          What HERCULES matched
        </PanelTitle>
        <div className="space-y-2">
          {matched.map((l) => {
            const open = openReasoning === l.id;
            return (
              <div key={l.id} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-base uppercase tracking-[0.08em]">
                    {l.origin} → {l.destination}
                  </span>
                  <div className="flex items-center gap-2">
                    <Pill tone="neutral">{l.equipment}</Pill>
                    <Pill tone="go">{money(l.rate)}</Pill>
                    <Pill tone="primary">{money2(l.ppm)}/mi</Pill>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.id} · {l.broker} · {l.miles} mi · assigned to {l.assignedUnit} ({l.driver}) ·{" "}
                  {l.stage}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pickup {l.pickup} · Delivery {l.delivery}
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  className="mt-2 w-full"
                  onClick={() => setOpenReasoning(open ? null : l.id)}
                >
                  {open ? "Hide" : "Show"} HERCULES' reasoning
                </Button>
                {open ? (
                  <ul className="mt-2 space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                    {l.reasoning.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-xs">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {r}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* EXCEPTIONS ONLY */}
      <Panel className="mt-3">
        <PanelTitle
          right={
            <Pill tone={critical ? "alert" : "go"}>
              <AlertTriangle className="h-3.5 w-3.5" /> {exceptions.length} open
            </Pill>
          }
        >
          Exceptions
        </PanelTitle>
        {exceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing needs you. HERCULES is running the fleet.
          </p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((x) => (
              <div
                key={x.id}
                className={cn(
                  "rounded-lg border p-3",
                  x.severity === "critical"
                    ? "border-destructive/45 bg-destructive/10"
                    : x.severity === "warn"
                      ? "border-warn/40 bg-warn/10"
                      : "border-border bg-card/50",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-base uppercase tracking-[0.08em]">
                    {exceptionLabel[x.kind]} · {x.unit}
                  </span>
                  <Pill tone={x.severity === "critical" ? "alert" : x.severity === "warn" ? "warn" : "neutral"}>
                    {x.opened}
                  </Pill>
                </div>
                <p className="mt-1 text-sm">{x.what}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {x.driver}
                  {x.loadId ? ` · load ${x.loadId}` : ""}
                </p>
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                  <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <strong className="uppercase tracking-[0.08em] text-primary">Already handled: </strong>
                    {x.hercules}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" size="lg" onClick={() => setConfirm(x)}>
                    Intervene — {x.override.toLowerCase()}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      clearException(x.id);
                      toast.success(`${x.unit} — left with HERCULES`, {
                        description: "No intervention. HERCULES keeps handling it.",
                      });
                    }}
                  >
                    Leave it with HERCULES
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <DriverApprovedNote>
          Override is an intervention on an exception, not day-to-day assignment work. Anything that
          reaches the truck still needs the driver's approval.
        </DriverApprovedNote>
      </Panel>

      {/* OVERRIDE LOG */}
      {overrides.length ? (
        <Panel className="mt-3">
          <PanelTitle right={<Pill tone="neutral">{overrides.length}</Pill>}>
            Interventions logged
          </PanelTitle>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {overrides.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-card/50 p-2.5 text-xs">
                <span className="font-semibold">{o.unit}</span> — {o.action}
                <span className="text-muted-foreground">
                  {" "}
                  · {new Date(o.at).toLocaleString()} · {o.by}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* EXPLICIT CONFIRMATION BEFORE ANY OVERRIDE */}
      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Panel className="w-full max-w-md border-primary/45">
            <Label>Confirm intervention</Label>
            <h2 className="mt-1 text-xl font-bold uppercase">{confirm.override}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirm.unit} · {confirm.driver}. This overrides what HERCULES already put in motion
              and the driver is told why.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" size="lg" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  intervene(confirm, confirm.override);
                  toast.success(`Intervention logged — ${confirm.unit}`, {
                    description: confirm.override,
                  });
                  setConfirm(null);
                }}
              >
                <Truck className="h-4 w-4" /> Yes — intervene
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
