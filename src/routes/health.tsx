import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Gauge, Wrench, CircleDot, BrainCircuit } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Metric, Pill, Bar } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { truckHealth, faultCodes, tires, predictions, driver } from "@/data/mock";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Truck Health — HERCULES" },
      {
        name: "description",
        content:
          "Live ECM and sensor readouts: fuel economy, engine hours, fault codes, tire pressure, brake wear, coolant and oil temp, DEF level, and idle time.",
      },
      { property: "og:title", content: "Truck Health — HERCULES" },
      {
        property: "og:description",
        content: "ECM readouts and predictive maintenance warnings in plain language.",
      },
    ],
  }),
  component: HealthPage,
});

const tone = (s: "ok" | "watch" | "alert") =>
  s === "ok" ? ("go" as const) : s === "watch" ? ("warn" as const) : ("alert" as const);

function HealthPage() {
  const alertsCount = truckHealth.filter((m) => m.status !== "ok").length + faultCodes.length;

  return (
    <AppShell title="Truck Health" subtitle={`${driver.truck} · ${driver.unit} · ECM live feed`}>
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelTitle
            right={
              <Pill tone={alertsCount ? "warn" : "go"}>
                <Gauge className="h-3.5 w-3.5" /> {alertsCount} items flagged
              </Pill>
            }
          >
            Sensor Readouts
          </PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {truckHealth.map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Label>{m.label}</Label>
                  {m.status !== "ok" ? (
                    <AlertTriangle
                      className={
                        "h-4 w-4 " + (m.status === "watch" ? "text-warn" : "text-destructive")
                      }
                    />
                  ) : null}
                </div>
                <Metric value={m.value} unit={m.unit} tone={tone(m.status)} className="mt-1" />
                {typeof m.pct === "number" ? (
                  <Bar className="mt-2" pct={m.pct} tone={tone(m.status)} />
                ) : null}
                <p className="mt-2 text-xs leading-snug text-muted-foreground">{m.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="alert">{faultCodes.length} active</Pill>}>
            Fault Codes
          </PanelTitle>
          <div className="space-y-2">
            {faultCodes.map((f) => (
              <div
                key={f.code}
                className={
                  "rounded-lg border p-3 " +
                  (f.severity === "alert"
                    ? "border-destructive/45 bg-destructive/10"
                    : "border-warn/45 bg-warn/10")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="metric font-bold">{f.code}</span>
                  <Pill tone={f.severity === "alert" ? "alert" : "watch"}>{f.system}</Pill>
                </div>
                <p className="mt-1 text-sm">{f.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.firstSeen}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="lg" className="mt-3 w-full">
            Have HERCULES read these aloud
          </Button>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel>
          <PanelTitle right={<Pill tone="watch">1 low</Pill>}>Tire Pressure</PanelTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {tires.map((t) => (
              <div
                key={t.pos}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <CircleDot
                    className={
                      "h-4 w-4 " +
                      (t.status === "ok"
                        ? "text-go"
                        : t.status === "watch"
                          ? "text-warn"
                          : "text-destructive")
                    }
                  />
                  <span className="text-sm">{t.pos}</span>
                </div>
                <div className="text-right">
                  <span
                    className={
                      "metric text-lg font-bold " +
                      (t.status === "ok"
                        ? "text-foreground"
                        : t.status === "watch"
                          ? "text-warn"
                          : "text-destructive")
                    }
                  >
                    {t.psi}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">/ {t.target} psi</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Suggestions only</Pill>}>
            Predictive Maintenance
          </PanelTitle>
          <div className="space-y-2">
            {predictions.map((p) => (
              <div key={p.title} className="rounded-lg border border-info/35 bg-info/8 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-base">{p.title}</span>
                  <Pill tone="info">{p.confidence}% match</Pill>
                </div>
                <p className="mt-1 text-sm">{p.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill tone="watch">
                    <Wrench className="h-3.5 w-3.5" /> {p.window}
                  </Pill>
                  <Button size="sm" variant="outline">
                    Schedule on my terms
                  </Button>
                  <Button size="sm" variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
            Learned from your truck's own history. HERCULES never schedules service without your
            approval.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
