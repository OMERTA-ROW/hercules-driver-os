import { Link } from "@tanstack/react-router";
import { ShoppingBasket, TriangleAlert } from "lucide-react";
import { useDelivery } from "@/lib/delivery";
import { serviceOf } from "@/data/delivery";
import { Panel } from "./primitives";

/**
 * Proactive delivery-coverage notice. HERCULES speaks up where the truck sits
 * so the driver knows to grab food BEFORE parking up for the night.
 * A notice only — nothing is ordered from here.
 */
export function CoverageNotice() {
  const { noFoodHere, unavailable, nearestCoveredAhead, location } = useDelivery();

  if (!noFoodHere) return null;

  const named = unavailable
    .map((id) => serviceOf(id).name)
    .filter((n) => ["Uber Eats", "DoorDash", "Grubhub"].includes(n));

  return (
    <Panel className="mb-3 border-warn/50 bg-warn/8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0 text-warn" />
          <div>
            <div className="text-lg font-semibold uppercase tracking-wide text-warn">
              No food delivery at {location.label}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {named.length > 0
                ? `${named.map((n) => `No ${n} available in this area`).join(" · ")}. `
                : ""}
              {nearestCoveredAhead
                ? `Closest coverage on your route is ${nearestCoveredAhead.label}, ${nearestCoveredAhead.milesAhead} miles ahead — eat there or order before you shut down here.`
                : "Nothing on your route ahead covers hot food — carry something in."}
            </p>
          </div>
        </div>
        <Link
          to="/supply"
          className="tech-label hairline flex min-h-[52px] items-center gap-2 rounded-full px-5 text-primary"
        >
          <ShoppingBasket className="h-4 w-4" />
          Check every service
        </Link>
      </div>
    </Panel>
  );
}
