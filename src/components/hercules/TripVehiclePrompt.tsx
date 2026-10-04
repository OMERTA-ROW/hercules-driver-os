import { Truck, Volume2 } from "lucide-react";
import { useVehicle } from "@/lib/vehicles";
import { useVoice } from "@/lib/voice";
import { rulesFor } from "@/data/vehicles";
import { Button } from "@/components/ui/button";
import { Label } from "./primitives";
import { useEffect, useRef } from "react";

/**
 * "WHAT ARE YOU IN TODAY?"
 * Fires once at the start of a trip when more than one piece of equipment is
 * saved. Spoken aloud, answered by tap or by voice. The answer drives routing
 * and hazard filtering for the whole trip.
 */
export function TripVehiclePrompt() {
  const { askForTrip, profiles, chooseForTrip, dismissTripPrompt } = useVehicle();
  const { announce } = useVoice();
  const asked = useRef(false);

  useEffect(() => {
    if (!askForTrip || asked.current) return;
    asked.current = true;
    announce(
      `Before you roll — what are you in today? I have ${profiles
        .map((p) => p.label)
        .join(", ")} saved. Whatever you pick, I route for it.`,
    );
  }, [askForTrip, profiles, announce]);

  if (!askForTrip) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[85] p-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem]">
      <div className="glass rounded-2xl border border-border p-4">
        <Label>Start of trip</Label>
        <h2 className="mt-1 font-display text-xl uppercase tracking-[0.1em]">
          What are you in today?
        </h2>
        <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
          <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Asked out loud — say it or
          tap it. Your answer sets the legal roads and the hazards for this trip.
        </p>
        <div className="mt-3 space-y-2">
          {profiles.map((p) => {
            const rules = rulesFor(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => chooseForTrip(p.id)}
                className="flex min-h-[68px] w-full items-center gap-3 rounded-[1.75rem] border border-primary/25 bg-background p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/8"
              >
                <Truck className="h-6 w-6 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-display text-sm uppercase tracking-[0.14em]">
                    {p.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.unit} · {p.heightFt}' · {p.grossWeightLbs.toLocaleString()} lb ·{" "}
                    {rules.backRoadsAllowed ? "back roads open" : "truck-legal roads only"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Button variant="outline" size="lg" className="mt-3 w-full" onClick={dismissTripPrompt}>
          Same as last trip
        </Button>
      </div>
    </div>
  );
}
