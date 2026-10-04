import { Package, Phone, Truck, Wrench, X } from "lucide-react";
import { countdownLabel, minutesOut, useArrivals, type Arrival } from "@/lib/arrivals";
import { Button } from "@/components/ui/button";

/**
 * Visual half of the inbound arrival notification. HERCULES says all of this
 * out loud too — the card is for a driver who happens to be looking, not the
 * only way to get the message.
 */

function Logo({ a }: { a: Arrival }) {
  if (a.kind === "delivery" && a.service) {
    const short = a.org.slice(0, 3).toUpperCase();
    return (
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold tracking-wide text-foreground"
        aria-hidden
      >
        {short}
      </span>
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
      <Wrench className="h-6 w-6" />
    </span>
  );
}

function Card({ a }: { a: Arrival }) {
  const { now, dismiss, markArrived } = useArrivals();
  const out = minutesOut(a, now);
  const hot = out <= 2 || a.status === "overdue";

  return (
    <div
      className={`pointer-events-auto w-[min(92vw,26rem)] rounded-2xl border bg-card p-4 ${
        a.status === "overdue"
          ? "border-foreground"
          : hot
            ? "border-foreground"
            : "border-border"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Logo a={a} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {a.kind === "delivery" ? "Delivery inbound" : "Roadside inbound"} · {a.org}
          </p>
          <p className="truncate text-lg font-bold uppercase tracking-wide text-foreground">
            {a.who}{" "}
            <span className="text-muted-foreground normal-case">
              {a.status === "overdue"
                ? "is past the window"
                : out <= 0.2
                  ? "is right outside"
                  : `is ${countdownLabel(a, now)} out`}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {a.kind === "delivery" ? (
              <Package className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Truck className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="truncate">
              {a.kind === "delivery" ? `Order from ${a.what}` : a.what}
            </span>
          </p>
          {a.vehicle ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/80">
              {a.vehicle}
            </p>
          ) : null}
          {a.quotedMin ? (
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              Quoted {a.quotedMin} min on the call
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p
            className={`metric text-2xl font-bold leading-none ${
              a.status === "overdue" ? "text-destructive" : "text-primary"
            }`}
          >
            {countdownLabel(a, now)}
          </p>
          <button
            onClick={() => dismiss(a.id)}
            className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => markArrived(a.id)}>
          They're here
        </Button>
        {a.phone ? (
          <a href={`tel:${a.phone.replace(/[^0-9]/g, "")}`}>
            <Button size="sm" variant="outline" className="gap-2">
              <Phone className="h-4 w-4" /> Call {a.who}
            </Button>
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function ArrivalStack() {
  const { inbound } = useArrivals();
  if (inbound.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[70] flex flex-col gap-3">
      {inbound.slice(0, 3).map((a) => (
        <Card key={a.id} a={a} />
      ))}
    </div>
  );
}
