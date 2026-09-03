import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  ParkingSquare,
  Moon,
  CalendarX,
  Check,
  Building2,
  Warehouse,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { PlanGate } from "@/components/hercules/PlanGate";
import {
  Panel,
  Label,
  Pill,
  DriverApprovedNote,
  money,
  money2,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loads, type Facility, type Load } from "@/data/mock";

export const Route = createFileRoute("/loads")({
  head: () => ({
    meta: [
      { title: "Load Board — HERCULES" },
      {
        name: "description",
        content:
          "Available loads with rate per mile, profit estimate, and full facility intelligence: hours, weekend closures, and safe parking — before you commit.",
      },
      { property: "og:title", content: "Load Board — HERCULES" },
      {
        property: "og:description",
        content:
          "Facility hours and parking intel on every load. Nothing books without your approval.",
      },
    ],
  }),
  component: LoadBoard,
});

function FacilityCard({ facility, role }: { facility: Facility; role: "Shipper" | "Receiver" }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{role}</Label>
        {facility.hours24 ? (
          <Pill tone="go">24-hour facility</Pill>
        ) : (
          <Pill tone="warn">
            {facility.open}–{facility.close}
          </Pill>
        )}
      </div>
      <div className="mt-1 font-display text-base">{facility.name}</div>

      <ul className="mt-2 space-y-1.5 text-sm">
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {facility.hours24
              ? "Open around the clock"
              : `Open ${facility.open} – ${facility.close}`}{" "}
            · {facility.appointment}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <CalendarX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{facility.weekend}</span>
        </li>
        <li className="flex items-start gap-2">
          <ParkingSquare
            className={
              "mt-0.5 h-4 w-4 shrink-0 " + (facility.onSiteParking ? "text-go" : "text-destructive")
            }
          />
          <span>
            {facility.onSiteParking ? "On-site truck parking" : "No on-site parking"} · nearest safe
            parking: {facility.nearestSafeParking}
            {facility.nearestSafeParkingMiles > 0
              ? ` (${facility.nearestSafeParkingMiles} mi)`
              : " (on property)"}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Moon
            className={
              "mt-0.5 h-4 w-4 shrink-0 " +
              (facility.overnightAllowed ? "text-go" : "text-destructive")
            }
          />
          <span>
            {facility.overnightAllowed ? "Overnight allowed on site" : "No overnight on site"}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">{facility.notes}</span>
        </li>
      </ul>
    </div>
  );
}

function LoadBoard() {
  const [confirming, setConfirming] = useState<Load | null>(null);
  const [booked, setBooked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(loads[0]!.id);

  return (
    <AppShell
      title="Load Board"
      subtitle="Facility intelligence on every load — hours, closures, and parking — before you commit"
    >
      <PlanGate feature="loads">
        <div className="space-y-3">
          {loads.map((load) => {
            const isOpen = expanded === load.id;
            const isBooked = booked.includes(load.id);
            return (
              <Panel key={load.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-xl uppercase">
                        {load.origin} → {load.destination}
                      </span>
                      <Pill
                        tone={
                          load.hosFit === "Fits your clock"
                            ? "go"
                            : load.hosFit === "Tight on your clock"
                              ? "warn"
                              : "alert"
                        }
                      >
                        {load.hosFit}
                      </Pill>
                      {isBooked ? <Pill tone="primary">Booked by you</Pill> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {load.id} · {load.broker} · broker score {load.brokerScore} · {load.commodity}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <Label>Rate</Label>
                      <div className="metric text-2xl font-bold">{money(load.rate)}</div>
                    </div>
                    <div>
                      <Label>Miles</Label>
                      <div className="metric text-2xl font-bold">
                        {load.miles}
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{load.deadhead} DH
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>Rate / mile</Label>
                      <div className="metric text-2xl font-bold text-primary">
                        {money2(load.rpm)}
                      </div>
                    </div>
                    <div>
                      <Label>Est. profit</Label>
                      <div className="metric text-2xl font-bold text-go">
                        {money(load.estProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        after {money(load.estFuel)} fuel · {money(load.estTolls)} tolls
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Pickup window: <span className="font-semibold">{load.pickupWindow}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    Delivery window: <span className="font-semibold">{load.deliveryWindow}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setExpanded(isOpen ? null : load.id)}
                  >
                    {isOpen ? "Hide" : "Show"} facility intelligence
                  </Button>
                  <Button
                    size="lg"
                    className="gap-2 font-display uppercase tracking-wider"
                    disabled={isBooked}
                    onClick={() => setConfirming(load)}
                  >
                    <Check className="h-5 w-5" />
                    {isBooked ? "Approved" : "Approve & Book"}
                  </Button>
                </div>

                {isOpen ? (
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    <FacilityCard facility={load.shipper} role="Shipper" />
                    <FacilityCard facility={load.receiver} role="Receiver" />
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>

        <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl uppercase">Confirm before booking</DialogTitle>
              <DialogDescription>
                HERCULES does not book anything on its own. Review and approve.
              </DialogDescription>
            </DialogHeader>
            {confirming ? (
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border border-border bg-card/70 p-3">
                  <div className="font-display text-lg">
                    {confirming.origin} → {confirming.destination}
                  </div>
                  <p className="text-muted-foreground">
                    {confirming.broker} · {confirming.id}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Rate</Label>
                    <div className="metric font-bold">{money(confirming.rate)}</div>
                  </div>
                  <div>
                    <Label>Rate / mile</Label>
                    <div className="metric font-bold text-primary">{money2(confirming.rpm)}</div>
                  </div>
                  <div>
                    <Label>Est. profit</Label>
                    <div className="metric font-bold text-go">{money(confirming.estProfit)}</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Receiver:{" "}
                  {confirming.receiver.hours24
                    ? "24-hour facility"
                    : `open ${confirming.receiver.open}–${confirming.receiver.close}`}
                  .{" "}
                  {confirming.receiver.overnightAllowed
                    ? "Overnight allowed."
                    : "No overnight on site."}{" "}
                  Nearest safe parking {confirming.receiver.nearestSafeParking}.
                </p>
                <DriverApprovedNote />
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="lg" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  if (confirming) {
                    setBooked((b) => [...b, confirming.id]);
                    toast.success(`${confirming.id} booked on your approval`, {
                      description: "Added to your plan. You can release it any time.",
                    });
                  }
                  setConfirming(null);
                }}
              >
                <Check className="h-5 w-5" /> Yes, book it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PlanGate>
    </AppShell>
  );
}
