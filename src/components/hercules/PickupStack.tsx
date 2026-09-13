import { Check, Clock, MapPin, Navigation2, ParkingSquare, Package, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePickup, type PickupRun } from "@/lib/pickup";

/**
 * PART PICKUP — the visual half. HERCULES says all of this out loud too; the
 * card is for a driver who happens to be looking.
 *
 * The route is OFFERED here. "Send it to my map" is the driver's explicit yes —
 * nothing is dispatched before that tap or a spoken yes.
 */

function Card({ r }: { r: PickupRun }) {
  const { approve, decline, collected, minutesOut } = usePickup();
  const out = minutesOut(r);
  const held = r.status === "held";
  const routed = r.status === "routed";

  return (
    <div
      className={
        "pointer-events-auto w-[min(92vw,27rem)] rounded-2xl border bg-black/95 p-4 backdrop-blur-sm " +
        (held
          ? "border-violet/50 shadow-[0_0_32px_-12px_hsl(280_90%_60%/0.5)]"
          : "border-primary/60 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]")
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
          <Package className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            {held ? "Pickup held — part not ready" : routed ? "Pickup route dispatched" : "Pickup route ready"}
          </p>
          <p className="truncate text-lg font-bold uppercase tracking-wide text-foreground">
            {r.label}
          </p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {r.vendor} · {r.site.name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            {r.site.milesAhead} mi ahead · {r.site.milesOffRoute.toFixed(1)} mi off route ·{" "}
            {r.driveMin} min
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
            {r.site.hours}
          </p>
          <p className="mt-1 text-xs text-primary">{r.ready}</p>
          <p className="mt-1 text-xs text-muted-foreground">{r.site.counter}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <ParkingSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
            {r.site.parking}
          </p>
          {routed && r.route?.hazards.length ? (
            <p className="mt-1 text-xs text-violet-300/80">
              On the way in: {r.route.hazards.map((h) => h.name).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="metric text-2xl font-bold leading-none text-primary">
            {routed ? `${Math.max(0, out)}m` : `${r.driveMin}m`}
          </p>
          <button
            onClick={() => decline(r.id)}
            className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground"
            aria-label="Dismiss pickup route"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {r.status === "offered" ? (
          <Button
            size="lg"
            className="h-14 gap-2 text-base"
            onClick={() => {
              void approve(r.id).then(() =>
                toast.success("Route dispatched on your word", {
                  description: `${r.site.name} — built for your unit's height and weight. Check posted signs.`,
                }),
              );
            }}
          >
            <Navigation2 className="h-5 w-5" /> Send it to my map
          </Button>
        ) : null}
        {routed ? (
          <Button
            size="lg"
            variant="secondary"
            className="h-14 gap-2"
            onClick={() => {
              collected(r.id);
              toast.success("Part collected", { description: r.label });
            }}
          >
            <Check className="h-5 w-5" /> Got the part
          </Button>
        ) : null}
        <Button size="lg" variant="ghost" className="h-14" onClick={() => decline(r.id)}>
          {held ? "Stop holding it" : "Not now"}
        </Button>
      </div>
      <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground/70">
        Driver approved — HERCULES offers the route, you dispatch it
      </p>
    </div>
  );
}

export function PickupStack() {
  const { runs } = usePickup();
  const live = runs.filter(
    (r) => r.status === "offered" || r.status === "held" || r.status === "routed",
  );
  if (!live.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[70] flex flex-col gap-3">
      {live.slice(0, 2).map((r) => (
        <Card key={r.id} r={r} />
      ))}
    </div>
  );
}
