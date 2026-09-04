import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Truck,
  Clock,
  MapPin,
  FileText,
  Navigation,
  TrendingUp,
  Activity,
  ShieldAlert,
  Coffee,
  Fuel,
  ShowerHead,
  ParkingSquare,
} from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
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
  hm,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { currentLoad, hos, driver, truckHealth, alerts, breakSuggestions } from "@/data/mock";
import { useStops } from "@/lib/stops";
import { ChainMarker } from "@/components/hercules/ChainMarker";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HERCULES Driver OS" },
      {
        name: "description",
        content:
          "Current load, hours of service, ETA, live profit per mile, and truck health at a glance. Voice-first, driver approved.",
      },
      { property: "og:title", content: "Dashboard — HERCULES Driver OS" },
      {
        property: "og:description",
        content: "Your run, your clock, your margin, your truck — all on one screen.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const watchItems = truckHealth.filter((m) => m.status !== "ok");
  const nearest = alerts[0]!;
  const nextBreak = breakSuggestions[0]!;
  const { stops, effectiveDiesel } = useStops();
  /** Clock-aware: how far can the driver legally get, and what is bookable there. */
  const rangeMiles = Math.round((hos.driveRemainingMin / 60) * 55);
  const clockTight = hos.driveRemainingMin <= 300;
  const bookable = stops
    .filter((s) => s.milesAhead <= rangeMiles && s.parkingReservable && s.showersOpen > 0)
    .slice(0, 3);

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${driver.truck} · ${driver.trailer} · ${driver.authority}`}
    >
      <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
        {/* Current load */}
        <Panel className="xl:row-span-2">
          <PanelTitle
            right={
              <Pill tone="go">
                <Truck className="h-3.5 w-3.5" /> {currentLoad.status}
              </Pill>
            }
          >
            Current Load · {currentLoad.id}
          </PanelTitle>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <Label>Origin</Label>
              <div className="font-display text-xl">{currentLoad.origin}</div>
              <p className="text-xs text-muted-foreground">Picked up {currentLoad.pickupAt}</p>
            </div>
            <div className="rounded-lg border border-border bg-card/60 p-3">
              <Label>Destination</Label>
              <div className="font-display text-xl">{currentLoad.destination}</div>
              <p className="text-xs text-muted-foreground">Deliver by {currentLoad.deliverBy}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div>
              <Label>Miles to go</Label>
              <Metric value={currentLoad.milesRemaining} unit="mi" tone="primary" />
              <Bar
                className="mt-2"
                pct={((currentLoad.miles - currentLoad.milesRemaining) / currentLoad.miles) * 100}
              />
            </div>
            <div>
              <Label>ETA</Label>
              <Metric value={currentLoad.etaLocal} />
              <p className="mt-2 text-xs text-muted-foreground">1h 48m of slack in the window</p>
            </div>
            <div>
              <Label>Line haul</Label>
              <Metric value={money(currentLoad.rate)} />
              <p className="mt-2 text-xs text-muted-foreground">
                {money2(currentLoad.rpm)}/mi gross
              </p>
            </div>
            <div>
              <Label>Commodity</Label>
              <p className="mt-1 text-sm leading-snug">{currentLoad.commodity}</p>
              <p className="mt-1 text-xs text-muted-foreground">{currentLoad.broker}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/navigation">
                <Navigation className="h-4 w-4" /> Navigate
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/loads">
                <MapPin className="h-4 w-4" /> Plan next load
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/documents" search={{ load: undefined, type: undefined, capture: false }}>
                <FileText className="h-4 w-4" /> Documents
              </Link>
            </Button>
          </div>
          <div className="mt-3">
            <DriverApprovedNote />
          </div>
        </Panel>

        {/* Profit per mile */}
        <Panel>
          <PanelTitle right={<Pill tone="primary">Live</Pill>}>Profit / Mile</PanelTitle>
          <Metric value={money2(currentLoad.profitPerMile)} unit="/mi" tone="go" className="text-5xl" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <Label>Gross</Label>
              <div className="metric font-semibold">{money2(currentLoad.rpm)}</div>
            </div>
            <div>
              <Label>Cost</Label>
              <div className="metric font-semibold text-warn">{money2(currentLoad.costPerMile)}</div>
            </div>
            <div>
              <Label>Deadhead</Label>
              <div className="metric font-semibold">{currentLoad.deadhead} mi</div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-go" /> $0.32/mi above your 30-day average
          </p>
        </Panel>

        {/* HOS */}
        <Panel>
          <PanelTitle
            right={
              <Pill tone="warn">
                <Clock className="h-3.5 w-3.5" /> Break in {hm(hos.breakInMin)}
              </Pill>
            }
          >
            Hours of Service
          </PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Drive remaining</Label>
              <Metric value={hm(hos.driveRemainingMin)} tone="primary" />
              <Bar className="mt-2" pct={(hos.driveRemainingMin / hos.driveTotalMin) * 100} />
            </div>
            <div>
              <Label>On duty remaining</Label>
              <Metric value={hm(hos.onDutyRemainingMin)} />
              <Bar
                className="mt-2"
                tone="info"
                pct={(hos.onDutyRemainingMin / hos.onDutyTotalMin) * 100}
              />
            </div>
          </div>
          <div className="mt-3">
            <Label>70-hour cycle</Label>
            <div className="flex items-center gap-3">
              <Bar pct={(hos.cycleRemainingHrs / hos.cycleTotalHrs) * 100} tone="go" />
              <span className="metric shrink-0 text-sm font-semibold">
                {hos.cycleRemainingHrs} h
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* Truck health at a glance */}
        <Panel>
          <PanelTitle
            right={
              <Pill tone={watchItems.length ? "watch" : "go"}>
                <Activity className="h-3.5 w-3.5" /> {watchItems.length} to watch
              </Pill>
            }
          >
            Truck Health
          </PanelTitle>
          <div className="space-y-2">
            {truckHealth.slice(0, 4).map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm">{m.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.detail}</div>
                </div>
                <div
                  className={
                    "metric shrink-0 text-lg font-bold " +
                    (m.status === "ok" ? "text-go" : m.status === "watch" ? "text-warn" : "text-destructive")
                  }
                >
                  {m.value}
                  <span className="ml-1 text-xs">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-3 w-full" size="lg" asChild>
            <Link to="/health">Open truck health</Link>
          </Button>
        </Panel>

        {/* Alerts ahead */}
        <Panel>
          <PanelTitle right={<Pill tone="alert">{nearest.milesAhead} mi ahead</Pill>}>
            Prepare Ahead
          </PanelTitle>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <span className="font-display uppercase tracking-wide">{nearest.kind}</span>
            </div>
            <p className="mt-1 text-sm">{nearest.location}</p>
            <p className="mt-1 text-xs text-muted-foreground">{nearest.note}</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Advance notice so you can get your pre-trip and paperwork in order and arrive prepared
            and compliant.
          </p>
          <Button variant="outline" className="mt-3 w-full" size="lg" asChild>
            <Link to="/alerts">Open alerts network</Link>
          </Button>
        </Panel>

        {/* Break suggestion */}
        <Panel>
          <PanelTitle right={<Pill tone="info">Suggestion</Pill>}>Your Rhythm</PanelTitle>
          <div className="rounded-lg border border-info/35 bg-info/10 p-3">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-info" />
              <span className="font-display uppercase tracking-wide">{nextBreak.when}</span>
            </div>
            <p className="mt-1 text-sm">{nextBreak.why}</p>
            <p className="mt-1 text-xs text-muted-foreground">{nextBreak.place}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="lg" className="flex-1">
              Accept
            </Button>
            <Button size="lg" variant="outline" className="flex-1">
              Not now
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A suggestion built from your own patterns — never an order.
          </p>
        </Panel>
      </div>

      {/* TRUCK STOP / PIT STOP layer — bookable stops inside the remaining clock */}
      <div className="mt-3">
        <Panel>
          <PanelTitle
            right={
              <Pill tone={clockTight ? "warn" : "info"}>
                {clockTight ? "Clock running out" : "Suggestion"}
              </Pill>
            }
          >
            <span className="flex items-center gap-2">
              <Fuel className="h-5 w-5" /> Pit stops in range
            </span>
          </PanelTitle>
          <p className="mb-3 text-sm text-muted-foreground">
            {clockTight
              ? `${hm(hos.driveRemainingMin)} of drive time left — about ${rangeMiles} miles. These stops still have a shower and a space you can hold now.`
              : `Bookable stops inside your remaining ${rangeMiles} miles of drive time.`}
          </p>
          <div className="grid gap-2 lg:grid-cols-3">
            {bookable.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <ChainMarker chain={s.chain} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.milesAhead} mi ahead</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Pill tone="go">${effectiveDiesel(s).toFixed(3)}/gal</Pill>
                  <Pill tone="info">
                    <ShowerHead className="h-3.5 w-3.5" /> {s.showersOpen} open
                  </Pill>
                  <Pill tone={s.parkingOpen > 10 ? "go" : "warn"}>
                    <ParkingSquare className="h-3.5 w-3.5" /> {s.parkingOpen}/{s.parkingTotal}
                  </Pill>
                </div>
              </div>
            ))}
            {bookable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookable stops loaded for this stretch yet.
              </p>
            ) : null}
          </div>
          <Button size="lg" className="mt-3 gap-2" asChild>
            <Link to="/stops">
              <Fuel className="h-4 w-4" /> Open truck stops & booking
            </Link>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            HERCULES adds a $2.00 booking fee per shower or parking reservation, shown on its own line
            before you approve anything.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
