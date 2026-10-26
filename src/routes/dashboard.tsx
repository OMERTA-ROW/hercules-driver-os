import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, Package, ShieldAlert, Wrench, Navigation2 } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { CapabilityDirectory } from "@/components/hercules/CapabilityDirectory";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  Metric,
  Bar,
  EmptyState,
  DriverApprovedNote,
  hm,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  money,
  place,
  useAlertRows,
  useCurrentLoad,
  useHours,
  useMileage,
  useMoneySummary,
  useReadings,
  useVehicles,
} from "@/lib/live";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Driver Dashboard & Add-on Status — HERCULES" },
      {
        name: "description",
        content:
          "Your driving records and the audited HERCULES add-on directory: partial capabilities, Demo previews and planned trucking features.",
      },
      { property: "og:title", content: "Driver Dashboard & Add-on Status — HERCULES" },
      {
        property: "og:description",
        content: "Your driving records and honest status for ten requested trucking add-ons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { account } = useAuth();
  const { hours } = useHours();
  const { load } = useCurrentLoad();
  const miles = useMileage();
  const summary = useMoneySummary();
  const { data: vehicles } = useVehicles();
  const rig = vehicles?.find((v) => v.active) ?? vehicles?.[0] ?? null;
  const readings = useReadings(rig?.id ?? null);
  const alerts = useAlertRows();
  const openAlerts = (alerts.data ?? []).filter((a) => !a.acknowledged_at);

  if (!account) {
    return (
      <AppShell title="Driver's command" subtitle="Dashboard · Add-ons · Your day">
        <CapabilityDirectory />
        <div className="mt-8 border-t border-border pt-6">
          <EmptyState
            title="Sign in to see your day"
            action={
              <Button asChild size="lg">
                <Link to="/sign-in">Sign in</Link>
              </Button>
            }
          >
            Everything here comes from your own account. Nothing is filled in for you.
          </EmptyState>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Driver's command" subtitle={rig ? rig.label : "Dashboard · No vehicle on file"}>
      <CapabilityDirectory />
      <h2 className="mb-4 mt-10 border-t border-border pt-6 font-display text-2xl uppercase">Your day</h2>
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* CLOCK */}
          <Panel>
            <PanelTitle
              right={
                <Pill tone="primary">
                  <Gauge className="h-3.5 w-3.5" /> Clock
                </Pill>
              }
            >
              Hours of service
            </PanelTitle>
            {hours ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Drive remaining</Label>
                  <Metric value={hm(hours.driveRemainingMin)} tone="primary" />
                  <Bar
                    className="mt-2"
                    pct={(hours.driveRemainingMin / hours.driveTotalMin) * 100}
                  />
                </div>
                <div>
                  <Label>On duty remaining</Label>
                  <Metric value={hm(hours.onDutyRemainingMin)} />
                  <Bar
                    className="mt-2"
                    tone="info"
                    pct={(hours.onDutyRemainingMin / hours.onDutyTotalMin) * 100}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Cycle remaining</Label>
                  <Metric value={hours.cycleRemainingHrs.toFixed(1)} unit="hrs" />
                </div>
              </div>
            ) : (
              <EmptyState title="No hours logged">
                Your clock builds from logged trips. Start a trip and HERCULES tracks it from there.
              </EmptyState>
            )}
          </Panel>

          {/* CURRENT LOAD */}
          <Panel>
            <PanelTitle
              right={
                <Pill tone="primary">
                  <Package className="h-3.5 w-3.5" /> Load
                </Pill>
              }
            >
              Current run
            </PanelTitle>
            {load ? (
              <div>
                <div className="font-display text-lg uppercase tracking-[0.08em]">
                  {place(load.origin_city, load.origin_state)} →{" "}
                  {place(load.dest_city, load.dest_state)}
                </div>
                <Label className="mt-1">
                  {load.reference ?? load.id.slice(0, 8)}
                  {load.broker_name ? ` · ${load.broker_name}` : ""} ·{" "}
                  {load.status.replace(/_/g, " ")}
                </Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Rate</Label>
                    <Metric value={money(load.rate_cents)} tone="go" />
                  </div>
                  <div>
                    <Label>Miles</Label>
                    <Metric value={load.miles ? load.miles.toLocaleString() : "—"} unit="mi" />
                  </div>
                </div>
                <Button asChild size="lg" className="mt-3 w-full gap-2">
                  <Link to="/navigation">
                    <Navigation2 className="h-4 w-4" /> Open the route
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No load booked"
                action={
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/loads">
                      <Package className="h-4 w-4" /> Open the board
                    </Link>
                  </Button>
                }
              >
                When you book freight it shows here with rate, miles, and windows.
              </EmptyState>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel>
            <Label>Miles this week</Label>
            <Metric
              value={miles.hasData ? miles.week.toLocaleString() : "—"}
              unit="mi"
              tone="primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {miles.hasData ? "From your logged trips." : "No trips logged yet."}
            </p>
          </Panel>
          <Panel>
            <Label>Revenue · 7 days</Label>
            <Metric value={summary.hasData ? money(summary.week.revenue) : "—"} tone="go" />
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.hasData ? "From your own entries." : "Nothing logged yet."}
            </p>
          </Panel>
          <Panel>
            <Label>Open alerts</Label>
            <Metric value={openAlerts.length} tone={openAlerts.length > 0 ? "warn" : "go"} />
            <Button asChild size="lg" variant="outline" className="mt-2 w-full gap-2">
              <Link to="/alerts">
                <ShieldAlert className="h-4 w-4" /> Alerts
              </Link>
            </Button>
          </Panel>
        </div>

        <Panel>
          <PanelTitle
            right={
              <Pill tone="primary">
                <Wrench className="h-3.5 w-3.5" /> Diagnostics
              </Pill>
            }
          >
            Vehicle health
          </PanelTitle>
          {(readings.data ?? []).length === 0 ? (
            <EmptyState
              title="Connect your ECU adapter"
              action={
                <Button asChild size="lg" className="gap-2">
                  <Link to="/health">
                    <Wrench className="h-4 w-4" /> Vehicle health
                  </Link>
                </Button>
              }
            >
              With THE BOLT paired, live engine readings and translated fault codes appear here.
              Until then nothing is reported.
            </EmptyState>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(readings.data ?? []).slice(0, 6).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div>
                    <div className="font-display text-sm uppercase tracking-[0.1em]">
                      {r.metric}
                    </div>
                    <Label>{new Date(r.recorded_at).toLocaleString()}</Label>
                  </div>
                  <span className="metric font-bold text-primary">
                    {r.value_num ?? r.value_text ?? "—"}
                    {r.unit ? ` ${r.unit}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <DriverApprovedNote />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
