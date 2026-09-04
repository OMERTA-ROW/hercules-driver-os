import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TriangleAlert,
  Mountain,
  Navigation2,
  Volume2,
  X,
  Ban,
  ParkingSquare,
  Clock,
  Satellite,
  RefreshCw,
  Route as RouteIcon,
} from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import { RouteMap, RouteShield, HazardBadge } from "@/components/hercules/RouteMap";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  primaryRoute,
  offRoutePosition,
  routeParking,
  destinationFacility,
  truckProfile,
  type LatLng,
  type TruckRoute,
} from "@/data/routing";
import { truckRouting, metersOffRoute } from "@/lib/truck-routing";
import {
  hazardLayer,
  effectiveSeverity,
  exceedsTruck,
  useHazardLayers,
} from "@/lib/hazard-layer";
import { hazardMeta, type Hazard } from "@/data/hazards";
import { currentLoad, hos } from "@/data/mock";
import { hm } from "@/components/hercules/primitives";

export const Route = createFileRoute("/navigation")({
  head: () => ({
    meta: [
      { title: "Navigation — HERCULES Truck-Legal Routing" },
      {
        name: "description",
        content:
          "Live GPS tracking on a street-level map with truck-legal routing, blue highway and white county route shields, and automatic reroute with voice announcement.",
      },
      { property: "og:title", content: "Navigation — HERCULES Truck-Legal Routing" },
      {
        property: "og:description",
        content: "Truck-legal route, live position, automatic reroute. The AI proposes, you decide.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NavigationScreen,
});

function NavigationScreen() {
  const [route, setRoute] = useState<TruckRoute>(primaryRoute);
  const [idx, setIdx] = useState(0); // index along the polyline (live GPS sim)
  const [position, setPosition] = useState<LatLng>(primaryRoute.polyline[0]!);
  const [offRoute, setOffRoute] = useState(false);
  const [notice, setNotice] = useState<null | { step: string; miles: number; road: string }>(null);
  const [spoken, setSpoken] = useState<string | null>(null);
  const rerouting = useRef(false);

  // ---------------------------------------------------------------- HAZARDS
  const { isOn } = useHazardLayers();
  const [allHazards, setAllHazards] = useState<Hazard[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    void hazardLayer.hazardsAhead({ profile: truckProfile }).then(setAllHazards);
  }, []);

  /** Mock odometer: the truck eats about a mile per GPS tick. */
  const traveled = idx * 1;

  const hazardsAhead = allHazards
    .filter((h) => isOn(h.kind))
    .map((h) => ({
      hazard: h,
      severity: effectiveSeverity(h, truckProfile),
      exceeds: exceedsTruck(h, truckProfile),
      milesAhead: Math.max(0, Math.round((h.milesAhead - traveled) * 10) / 10),
    }))
    .filter((h) => h.milesAhead > 0)
    .sort((a, b) => a.milesAhead - b.milesAhead);

  /** Proactive, distance-based: fires well before the hazard, not on top of it. */
  const warning =
    hazardsAhead.find(
      (h) => h.milesAhead <= h.hazard.warnAtMiles && !dismissed.includes(h.hazard.id),
    ) ?? null;

  // Voice announcement, once per hazard, far enough out to act on it.
  useEffect(() => {
    if (!warning || announced.current === warning.hazard.id) return;
    announced.current = warning.hazard.id;
    setSpoken(warning.hazard.speech);
  }, [warning]);

  // Live GPS tracking — the truck advances along the truck-legal polyline.
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (offRoute) return;
    const pts = route.polyline;
    const a = pts[idx % pts.length]!;
    const b = pts[(idx + 1) % pts.length]!;
    setPosition({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });
  }, [idx, route, offRoute]);

  /**
   * AUTOMATIC REROUTE.
   * No button, no selection: when the GPS fix leaves the corridor, the truck
   * routing provider is asked for a new truck-legal path immediately and it is
   * applied. The driver can dismiss or keep the old path (DRIVER APPROVED) —
   * but they are never left without a path.
   */
  const autoReroute = useCallback(async (fix: LatLng) => {
    if (rerouting.current) return;
    rerouting.current = true;
    const next = await truckRouting.reroute({
      position: fix,
      destination: primaryRoute.polyline[primaryRoute.polyline.length - 1]!,
      profile: truckProfile,
    });
    setRoute(next);
    setOffRoute(false);
    const step = next.steps[0]!;
    setNotice({ step: step.text, miles: next.remainingMiles, road: step.road });
    // Voice announcement so the driver never has to look down.
    setSpoken(
      `Route recalculated. ${step.text}. ${next.remainingMiles} miles remaining, new ETA ${next.etaLocal}. Truck legal for your 13 foot 6 configuration.`,
    );
    rerouting.current = false;
  }, []);

  // Off-route detection runs on every GPS fix.
  useEffect(() => {
    if (!offRoute) return;
    const off = metersOffRoute(offRoutePosition, primaryRoute.polyline);
    if (off > 250) void autoReroute(offRoutePosition);
  }, [offRoute, autoReroute]);

  const simulateMissedTurn = () => {
    setOffRoute(true);
    setPosition(offRoutePosition);
    setNotice(null);
    setSpoken("Off route. Recalculating a truck-legal path…");
  };

  const nextStep = route.steps[0]!;

  return (
    <AppShell
      title="Navigation"
      subtitle={`${route.label} · truck-legal for ${truckProfile.heightFt}' / ${truckProfile.grossWeightLbs.toLocaleString()} lb / ${truckProfile.lengthFt}'`}
    >
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr]">
        {/* MAP */}
        <Panel className="relative overflow-hidden p-0 xl:row-span-2">
          <div className="h-[52vh] w-full min-h-[340px] xl:h-[62vh]">
            <RouteMap
              polyline={route.polyline}
              position={position}
              segments={route.segments}
              offRoute={offRoute}
              hazards={hazardsAhead.map(({ hazard, severity }) => ({ hazard, severity }))}
            />
          </div>

          {/* Next turn heads-up */}
          <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-xl border border-border bg-background/85 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <RouteShield road={nextStep.road} cls={nextStep.class} />
              <div>
                <Label>In {nextStep.inMiles} mi</Label>
                <div className="font-display text-lg leading-tight sm:text-xl">{nextStep.text}</div>
                <p className="text-xs text-muted-foreground">{nextStep.lane}</p>
              </div>
            </div>
          </div>

          {/* GPS status */}
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-border bg-background/85 px-3 py-2 backdrop-blur">
            <Pill tone={offRoute ? "warn" : "go"}>
              <Satellite className="h-3.5 w-3.5" />
              {offRoute ? "Off route — recalculating" : "GPS locked · tracking"}
            </Pill>
          </div>

          {/* AUTO-REROUTE NOTICE */}
          {notice ? (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-primary/50 bg-primary/12 p-3 backdrop-blur">
              <div className="flex items-start gap-3">
                <RefreshCw className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="font-display uppercase tracking-wide text-primary">
                    Route recalculated automatically
                  </div>
                  <p className="text-sm">
                    {notice.step} · {notice.miles} mi remaining · ETA {route.etaLocal}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Suggestion only — keep your old line if you know better. You are never left
                    without a path.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button size="lg" onClick={() => setNotice(null)}>
                    Accept
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      setRoute(primaryRoute);
                      setNotice(null);
                      setSpoken("Holding your original route. I will keep watching for a legal line.");
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Panel>

        {/* TRIP READOUTS — same numbers as the dashboard */}
        <Panel>
          <PanelTitle right={<Pill tone="primary">Live</Pill>}>
            {currentLoad.id} · {currentLoad.destination}
          </PanelTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Miles remaining</Label>
              <Metric value={route.remainingMiles} unit="mi" tone="primary" />
            </div>
            <div>
              <Label>ETA</Label>
              <Metric value={route.etaLocal} />
            </div>
            <div>
              <Label>Drive left</Label>
              <Metric value={hm(hos.driveRemainingMin)} tone="go" />
            </div>
            <div>
              <Label>Break in</Label>
              <Metric value={hm(hos.breakInMin)} tone="warn" />
            </div>
          </div>
          {spoken ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-info/35 bg-info/10 p-3 text-sm">
              <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-info" />
              <span>“{spoken}”</span>
            </div>
          ) : null}
          <Button size="lg" variant="outline" className="mt-3 w-full gap-2" onClick={simulateMissedTurn}>
            <Navigation2 className="h-4 w-4" /> Simulate a missed turn
          </Button>
          <div className="mt-3">
            <DriverApprovedNote />
          </div>
        </Panel>

        {/* TURN LIST */}
        <Panel>
          <PanelTitle right={<Pill tone="info">{route.provider.includes("mock") ? "Mock provider" : "Live"}</Pill>}>
            Turn by turn
          </PanelTitle>
          <ol className="space-y-2">
            {route.steps.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2.5"
              >
                <RouteShield road={s.road} cls={s.class} />
                <div className="min-w-0">
                  <div className="text-sm leading-snug">{s.text}</div>
                  <div className="text-xs text-muted-foreground">
                    In {s.inMiles} mi · {s.lane}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {/* SHIELD LEGEND + LEGAL SEGMENTS */}
        <Panel>
          <PanelTitle right={<Pill tone="go">Truck legal only</Pill>}>Route shields</PanelTitle>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <RouteShield road="I-35" cls="interstate" />
              <span className="text-sm text-muted-foreground">Interstate / US highway</span>
            </div>
            <div className="flex items-center gap-2">
              <RouteShield road="OK-39" cls="county" />
              <span className="text-sm text-muted-foreground">Legal county / secondary</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {route.segments.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-card/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display uppercase tracking-wide">{s.road}</span>
                  <span className="metric text-sm">{s.miles} mi</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clearance {s.clearanceFt}' · limit {s.weightLimitLbs.toLocaleString()} lb · {s.note}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        {/* RESTRICTIONS EXCLUDED FOR THIS TRUCK */}
        <Panel>
          <PanelTitle right={<Pill tone="alert">Excluded</Pill>}>Kept off your route</PanelTitle>
          <div className="space-y-2">
            {truckRouting.restrictions(truckProfile).map((r) => (
              <div
                key={r.road}
                className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-2.5"
              >
                <Ban className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <div className="text-sm font-semibold">
                    {r.kind} · {r.road}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Height, weight, length, width, hazmat, and posted truck-restricted roads come from the
            commercial truck-routing layer — not from the base map.
          </p>
        </Panel>

        {/* PARKING + FACILITY INTELLIGENCE (shared with the load board) */}
        <Panel>
          <PanelTitle right={<Pill tone="info">Facility intel</Pill>}>Parking ahead</PanelTitle>
          <div className="space-y-2">
            {routeParking.map((p) => (
              <div key={p.name} className="rounded-lg border border-border bg-card/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ParkingSquare className="h-4 w-4 text-info" /> {p.name}
                  </span>
                  <span className="metric text-sm">{p.milesAhead} mi</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.spots} · {p.overnight ? "Overnight allowed" : "No overnight"} · {p.note}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border bg-card/60 p-2.5">
            <Label>Receiver</Label>
            <div className="text-sm font-semibold">{destinationFacility.name}</div>
            <p className="text-xs text-muted-foreground">
              {destinationFacility.hours24
                ? "24-hour facility"
                : `${destinationFacility.open}–${destinationFacility.close}`}{" "}
              · {destinationFacility.weekend} · {destinationFacility.appointment} · nearest safe
              parking {destinationFacility.nearestSafeParking} (
              {destinationFacility.nearestSafeParkingMiles} mi)
            </p>
          </div>
          <Button variant="outline" size="lg" className="mt-3 w-full gap-2" asChild>
            <Link to="/loads">
              <RouteIcon className="h-4 w-4" /> Load board facility intel
            </Link>
          </Button>
        </Panel>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-4 w-4" /> Base map and street detail: Google Maps. Truck-legal
        attributes: commercial routing layer (mocked in this pass, provider-pluggable).
      </p>
    </AppShell>
  );
}
