import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Radio, ThumbsUp, ClipboardCheck, Users, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Pill, Metric } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { alerts, preTripChecklist } from "@/data/mock";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Driver Alert Network — HERCULES" },
      {
        name: "description",
        content:
          "Driver-to-driver advance notice of DOT presence, open scales, and inspection activity so you can arrive prepared and compliant.",
      },
      { property: "og:title", content: "Driver Alert Network — HERCULES" },
      {
        property: "og:description",
        content: "A compliance preparation and warning system built by drivers, for drivers.",
      },
    ],
  }),
  component: AlertsPage,
});

const kindTone = (s: "high" | "medium" | "low") =>
  s === "high" ? ("alert" as const) : s === "medium" ? ("watch" as const) : ("info" as const);

function AlertsPage() {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [checks, setChecks] = useState<string[]>([]);

  return (
    <AppShell
      title="Driver Alert Network"
      subtitle="Advance notice from drivers ahead of you — so you arrive prepared and compliant"
    >
      <Panel className="border-primary/40">
        <div className="flex flex-wrap items-start gap-3">
          <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg uppercase">Compliance preparation, not evasion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This network exists so you get time to complete your pre-trip and post-trip, square up
              your logs and paperwork, secure your load, and{" "}
              <span className="font-semibold text-foreground">arrive prepared and compliant</span>.
              It is not a tool for avoiding inspection or enforcement.
            </p>
          </div>
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <Panel>
            <PanelTitle
              right={
                <Pill tone="primary">
                  <Users className="h-3.5 w-3.5" /> 2,481 drivers nearby
                </Pill>
              }
            >
              Reports Along Your Route
            </PanelTitle>
            <div className="space-y-2">
              {alerts.map((a) => {
                const isConfirmed = confirmed.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={
                      "rounded-lg border p-3 " +
                      (a.severity === "high"
                        ? "border-destructive/45 bg-destructive/8"
                        : a.severity === "medium"
                          ? "border-warn/40 bg-warn/8"
                          : "border-border bg-card/60")
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={kindTone(a.severity)}>{a.kind}</Pill>
                          <span className="font-display text-lg">{a.location}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {a.road} · reported {a.reportedAgo} by {a.reporter} ·{" "}
                          {a.confirmations + (isConfirmed ? 1 : 0)} confirmations
                        </p>
                        <p className="mt-1 text-sm">{a.note}</p>
                      </div>
                      <div className="text-right">
                        <Label>Ahead</Label>
                        <div className="metric text-2xl font-bold text-primary">
                          {a.milesAhead}
                          <span className="ml-1 text-xs">mi</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={isConfirmed ? "secondary" : "outline"}
                        className="gap-1.5"
                        disabled={isConfirmed}
                        onClick={() => {
                          setConfirmed((c) => [...c, a.id]);
                          toast.success("Confirmation shared with drivers behind you");
                        }}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {isConfirmed ? "Confirmed" : "Still there"}
                      </Button>
                      <Button size="sm" variant="ghost">
                        No longer active
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel>
            <PanelTitle right={<Pill tone="go">Anonymous</Pill>}>Report to the Network</PanelTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                "DOT presence",
                "Scale open",
                "Inspection activity",
                "Weigh station closed",
                "Road hazard",
                "Parking full",
              ].map((k) => (
                <Button
                  key={k}
                  variant="outline"
                  size="lg"
                  className="h-16 text-sm"
                  onClick={() =>
                    toast.success(`“${k}” shared at your current position`, {
                      description: "Posted anonymously. Drivers behind you get advance notice.",
                    })
                  }
                >
                  {k}
                </Button>
              ))}
            </div>
            <Button size="lg" className="mt-3 w-full gap-2">
              <Send className="h-4 w-4" /> Report by voice
            </Button>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="h-3.5 w-3.5" /> Reports carry your callsign only — never your name
              or exact truck.
            </p>
          </Panel>

          <Panel>
            <PanelTitle right={<Pill tone="watch">34 mi to first report</Pill>}>
              Arrive Prepared
            </PanelTitle>
            <div className="space-y-2">
              {preTripChecklist.map((c) => {
                const done = checks.includes(c);
                return (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-3"
                  >
                    <Checkbox
                      checked={done}
                      onCheckedChange={(v) =>
                        setChecks((prev) => (v ? [...prev, c] : prev.filter((x) => x !== c)))
                      }
                      className="h-6 w-6"
                    />
                    <span className={"text-sm " + (done ? "text-muted-foreground line-through" : "")}>
                      {c}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <Label>Ready</Label>
                <Metric
                  value={`${checks.length}/${preTripChecklist.length}`}
                  tone={checks.length === preTripChecklist.length ? "go" : "warn"}
                />
              </div>
              <ClipboardCheck
                className={
                  "h-10 w-10 " +
                  (checks.length === preTripChecklist.length ? "text-go" : "text-muted-foreground")
                }
              />
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
