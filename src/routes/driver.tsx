import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sunrise, Coffee, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Metric, Pill, Bar } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  driver,
  fatigueModel,
  alertnessCurve,
  breakSuggestions,
  rhythmStats,
} from "@/data/mock";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver Profile & Learning — HERCULES" },
      {
        name: "description",
        content:
          "Your personal fatigue and rhythm model. Break guidance built from your own patterns — always a suggestion, never enforcement.",
      },
      { property: "og:title", content: "Driver Profile & Learning — HERCULES" },
      {
        property: "og:description",
        content: "HERCULES learns how you drive and rest, then suggests. You always decide.",
      },
    ],
  }),
  component: DriverProfile,
});

function DriverProfile() {
  return (
    <AppShell
      title="Driver Profile & Learning"
      subtitle={`${driver.name} · ${driver.callsign} · ${fatigueModel.daysObserved} days of your own data`}
    >
      <Panel className="border-info/35">
        <div className="flex flex-wrap items-start gap-3">
          <Sparkles className="h-7 w-7 shrink-0 text-info" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            This model is built from{" "}
            <span className="font-semibold text-foreground">your</span> patterns, not a blanket rule
            book. Every break, stop, and shutdown below is a suggestion you can accept, move, or
            ignore. You are the captain of this ship.
          </p>
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelTitle right={<Pill tone="info">You vs. fleet average</Pill>}>
            Your Alertness Curve
          </PanelTitle>
          <div className="flex h-56 items-end gap-1.5">
            {alertnessCurve.map((p) => (
              <div key={p.hour} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end justify-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${p.you}%` }}
                    title={`You: ${p.you}`}
                  />
                  <div
                    className="w-1/3 rounded-t bg-muted-foreground/40"
                    style={{ height: `${p.fleet}%` }}
                    title={`Fleet: ${p.fleet}`}
                  />
                </div>
                <span className="label-cap">{p.hour}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{fatigueModel.personalNote}</p>
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2">
          <Panel>
            <Label>Your peak window</Label>
            <div className="metric mt-1 text-2xl font-bold text-go">{fatigueModel.peakHours}</div>
            <Sunrise className="mt-2 h-6 w-6 text-go" />
          </Panel>
          <Panel>
            <Label>Your afternoon dip</Label>
            <div className="metric mt-1 text-2xl font-bold text-warn">{fatigueModel.dipHours}</div>
            <Coffee className="mt-2 h-6 w-6 text-warn" />
          </Panel>
          <Panel>
            <Label>Diminishing returns after</Label>
            <div className="metric mt-1 text-2xl font-bold text-destructive">
              {fatigueModel.hardWall}
            </div>
            <Moon className="mt-2 h-6 w-6 text-destructive" />
          </Panel>
          <Panel>
            <Label>Average sleep</Label>
            <div className="metric mt-1 text-2xl font-bold">{fatigueModel.avgSleep}</div>
            <Activity className="mt-2 h-6 w-6 text-muted-foreground" />
          </Panel>
          <Panel className="sm:col-span-2">
            <Label>Sleep consistency</Label>
            <div className="mt-1 flex items-center gap-3">
              <Bar pct={fatigueModel.sleepConsistency} tone="go" />
              <span className="metric font-bold">{fatigueModel.sleepConsistency}%</span>
            </div>
            <Label className="mt-3">Rest quality</Label>
            <div className="mt-1 flex items-center gap-3">
              <Bar pct={fatigueModel.restQuality} tone="info" />
              <span className="metric font-bold">{fatigueModel.restQuality}%</span>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelTitle right={<Pill tone="info">Suggestions only</Pill>}>
            Break Guidance For You
          </PanelTitle>
          <div className="space-y-2">
            {breakSuggestions.map((b) => (
              <div key={b.when} className="rounded-lg border border-info/35 bg-info/8 p-3">
                <div className="font-display text-lg">{b.when}</div>
                <p className="mt-1 text-sm">{b.why}</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.place}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    onClick={() => toast.success("Break added to your plan on your approval")}
                  >
                    Accept suggestion
                  </Button>
                  <Button size="lg" variant="outline">
                    Push it out 45 min
                  </Button>
                  <Button size="lg" variant="ghost">
                    I'm good, skip it
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            HERCULES will never force a break, lock the truck, or report your choices. It offers what
            your own history says works.
          </p>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="primary">Learned</Pill>}>Your Rhythm</PanelTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {rhythmStats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card/60 p-3">
                <Label>{s.label}</Label>
                <Metric value={s.value} className="text-2xl" />
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-card/60 p-3">
            <Label>Truck & authority</Label>
            <p className="mt-1 text-sm">{driver.truck}</p>
            <p className="text-sm text-muted-foreground">
              {driver.trailer} · {driver.authority}
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
