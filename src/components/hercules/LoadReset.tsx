import { useState } from "react";
import { RotateCcw, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrentLoad, useHours, place } from "@/lib/live";
import { DriverApprovedNote, Label, Pill } from "./primitives";
import { cn } from "@/lib/utils";

export function LoadResetButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"reasons" | "working" | "plan">("reasons");
  const [reason, setReason] = useState<string | null>(null);

  const reasons = ["Load fell through", "Breakdown", "Stuck in detention", "Weather / road closure"];
  const { hours } = useHours();
  const { load } = useCurrentLoad();

  /* The plan is built from what is actually known. Anything HERCULES cannot
     back up is stated as unknown rather than filled in. */
  const plan = [
    {
      label: "Hours",
      detail: hours
        ? `${Math.floor(hours.driveRemainingMin / 60)}h ${hours.driveRemainingMin % 60}m drive left, ${hours.cycleRemainingHrs.toFixed(1)}h on the cycle`
        : "No logged hours yet — start a trip and the clock rebuilds from your own records",
    },
    {
      label: "Route",
      detail: load
        ? `${place(load.origin_city, load.origin_state)} → ${place(load.dest_city, load.dest_state)}${load.miles ? ` · ${load.miles.toLocaleString()} mi` : ""}`
        : "No load booked — nothing to reroute yet",
    },
    {
      label: "Parking and rest",
      detail: "Stops are proposed from the map once your location is live. Nothing is reserved.",
    },
    {
      label: "Replacement loads",
      detail: "Pulled from what brokers have actually posted on the board.",
    },
  ];

  function pick(r: string) {
    setReason(r);
    setPhase("working");
    setTimeout(() => setPhase("plan"), 1400);
  }

  function reset() {
    setPhase("reasons");
    setReason(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="lg" className={cn("gap-2 font-display uppercase tracking-wider", className)}>
          <RotateCcw className="h-5 w-5" />
          Load Reset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl uppercase">Load Reset</DialogTitle>
          <DialogDescription>
            Rebuilds your whole day — hours, route, parking, food, rest — and starts surfacing
            replacement loads. Nothing is committed until you approve it.
          </DialogDescription>
        </DialogHeader>

        {phase === "reasons" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {reasons.map((r) => (
              <Button
                key={r}
                variant="outline"
                size="lg"
                className="h-16 justify-start text-base"
                onClick={() => pick(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        ) : null}

        {phase === "working" ? (
          <div className="flex items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Recalculating your day around “{reason}”…</span>
          </div>
        ) : null}

        {phase === "plan" ? (
          <div className="space-y-3">
            <Pill tone="warn">Proposed plan · {reason}</Pill>
            <div className="space-y-2">
              {resetPlan.map((p) => (
                <div key={p.label} className="rounded-lg border border-border bg-card/70 px-3 py-2">
                  <Label>{p.label}</Label>
                  <p className="text-sm">{p.detail}</p>
                </div>
              ))}
            </div>
            <DriverApprovedNote />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Keep my current plan
          </Button>
          {phase === "plan" ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => {
                setOpen(false);
                reset();
                toast.success("Day rebuilt on your approval", {
                  description: "Route, rest, and replacement loads updated. You can override anything.",
                });
              }}
            >
              <Check className="h-5 w-5" />
              Approve this plan
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
