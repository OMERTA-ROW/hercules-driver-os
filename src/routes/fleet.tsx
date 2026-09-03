import { createFileRoute } from "@tanstack/react-router";
import { Truck, Users, BarChart3 } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { PlanGate } from "@/components/hercules/PlanGate";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  Bar,
  DriverApprovedNote,
  money,
  money2,
} from "@/components/hercules/primitives";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet Overview — HERCULES" },
      {
        name: "description",
        content:
          "Multi-truck management and consolidated reporting for carriers: utilization, margin per truck, health flags, and driver hours.",
      },
      { property: "og:title", content: "Fleet Overview — HERCULES" },
      {
        property: "og:description",
        content: "Every truck, every driver, one screen — with consolidated reporting.",
      },
    ],
  }),
  component: Fleet,
});

const trucks = [
  { unit: "T-114", driver: "V. Bass", status: "Rolling", loaded: true, ppm: 2.43, hos: 246, health: "ok" },
  { unit: "T-207", driver: "M. Duarte", status: "At dock", loaded: true, ppm: 1.92, hos: 118, health: "watch" },
  { unit: "T-233", driver: "R. Cole", status: "Empty — searching", loaded: false, ppm: 0.0, hos: 402, health: "ok" },
  { unit: "T-318", driver: "J. Whitlow", status: "34-hr reset", loaded: false, ppm: 0.0, hos: 660, health: "alert" },
] as const;

function Fleet() {
  const active = trucks.filter((t) => t.loaded).length;
  const revenue = 61_480;
  const avgPpm = 2.11;

  return (
    <AppShell title="Fleet" subtitle="Multi-truck management and consolidated reporting">
      <PlanGate feature="fleet">
        <div className="grid gap-3 lg:grid-cols-3">
          <Panel>
            <PanelTitle right={<Pill tone="primary">This week</Pill>}>Utilization</PanelTitle>
            <Metric value={`${active}/${trucks.length}`} unit="loaded" tone="primary" />
            <Bar className="mt-2" pct={(active / trucks.length) * 100} />
            <p className="mt-3 text-xs text-muted-foreground">
              Two trucks need a plan. HERCULES has candidate loads staged — a dispatcher still
              approves each one.
            </p>
          </Panel>
          <Panel>
            <PanelTitle right={<Pill tone="go">Consolidated</Pill>}>Revenue</PanelTitle>
            <Metric value={money(revenue)} tone="go" />
            <p className="mt-3 text-xs text-muted-foreground">Gross line haul, 4 trucks, week to date.</p>
          </Panel>
          <Panel>
            <PanelTitle right={<Pill tone="info">Fleet avg</Pill>}>Profit / mile</PanelTitle>
            <Metric value={money2(avgPpm)} unit="/mi" />
            <p className="mt-3 text-xs text-muted-foreground">
              Net after fuel, tolls, and fixed cost across all units.
            </p>
          </Panel>
        </div>

        <Panel className="mt-3">
          <PanelTitle
            right={
              <Pill tone="neutral">
                <Users className="h-3.5 w-3.5" /> {trucks.length} trucks
              </Pill>
            }
          >
            <span className="inline-flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Trucks
            </span>
          </PanelTitle>
          <div className="space-y-2">
            {trucks.map((t) => (
              <div
                key={t.unit}
                className="grid gap-2 rounded-lg border border-border bg-card/60 p-3 sm:grid-cols-5 sm:items-center"
              >
                <div>
                  <Label>Unit</Label>
                  <div className="font-display text-lg uppercase">{t.unit}</div>
                </div>
                <div>
                  <Label>Driver</Label>
                  <div className="text-sm">{t.driver}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="text-sm">{t.status}</div>
                </div>
                <div>
                  <Label>Profit / mile</Label>
                  <div className="metric text-sm font-semibold">
                    {t.ppm ? money2(t.ppm) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <Pill tone={t.health === "ok" ? "go" : t.health === "watch" ? "watch" : "alert"}>
                    {t.health === "ok" ? "Healthy" : t.health === "watch" ? "Watch" : "Service due"}
                  </Pill>
                  <span className="metric text-xs text-muted-foreground">
                    {Math.floor(t.hos / 60)}h {t.hos % 60}m HOS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="mt-3">
          <PanelTitle right={<Pill tone="info">Export ready</Pill>}>
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Consolidated reporting
            </span>
          </PanelTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <Label>Fuel spend</Label>
              <div className="metric text-2xl font-bold">{money(18_240)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <Label>Detention billed</Label>
              <div className="metric text-2xl font-bold">{money(1_150)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <Label>IFTA accrual</Label>
              <div className="metric text-2xl font-bold">{money(2_390)}</div>
            </div>
          </div>
          <div className="mt-3">
            <DriverApprovedNote>
              Fleet suggestions are proposals. Drivers keep the final say on their own loads, breaks,
              and routes.
            </DriverApprovedNote>
          </div>
        </Panel>
      </PlanGate>
    </AppShell>
  );
}
