/**
 * TRUCK-LEGAL ROUTING ADAPTER
 * ===========================
 * Google Maps supplies the base map tiles, geometry rendering, and street-level
 * detail only. It does NOT supply commercial-vehicle attributes — bridge and
 * overpass clearances, posted weight limits, length/width restrictions, hazmat
 * class routing, or truck-restricted roads are simply not in the Maps APIs.
 *
 * Everything truck-legal therefore lives behind this single adapter interface.
 * Today it is backed by `mockTruckRoutingProvider` (data in src/data/routing.ts).
 * To go live, implement `TruckRoutingProvider` against a commercial provider —
 * HERE Routing v8 (`transport.truck` + `truck[height|weight|length|width]`,
 * `shippedHazardousGoods`), Trimble/PC*MILER (`routePath` with `vehicleType`,
 * `heightFeet`, `weightPounds`, `hazMatType`), or equivalent — and swap the
 * export at the bottom. No UI code changes.
 *
 * Provider calls must run server-side (createServerFn) so the commercial API
 * key never reaches the browser; only the resulting truck-legal geometry is
 * handed to the Google Maps layer for drawing.
 */

import {
  primaryRoute,
  rerouteOption,
  excludedRoads,
  type LatLng,
  type TruckRoute,
} from "@/data/routing";
import { rulesFor, type VehicleProfile } from "@/data/vehicles";

/** The routing engine is driven by the active vehicle profile, not a constant. */
export type TruckProfile = VehicleProfile;

export type TruckRoutingProvider = {
  name: string;
  /** Truck-legal route for a given origin/destination and truck configuration. */
  route(args: {
    from: LatLng;
    to: LatLng;
    profile: TruckProfile;
  }): Promise<TruckRoute>;
  /** Called automatically when the truck leaves the corridor. No driver tap. */
  reroute(args: {
    position: LatLng;
    destination: LatLng;
    profile: TruckProfile;
  }): Promise<TruckRoute>;
  /** Roads excluded for this configuration — surfaced so the driver sees WHY. */
  restrictions(profile: TruckProfile): typeof excludedRoads[number][];
};

export const mockTruckRoutingProvider: TruckRoutingProvider = {
  name: "HERCULES mock truck-routing provider",
  async route({ profile }) {
    return legalFor(primaryRoute, profile);
  },
  async reroute({ profile }) {
    // A real provider recalculates from the live GPS fix using the same truck
    // constraint set, guaranteeing the returned path is legal for this unit.
    return legalFor(rerouteOption, profile);
  },
  restrictions(profile) {
    const rules = rulesFor(profile);
    // A cargo van is legal on the back roads a trailer is kept off of.
    if (rules.backRoadsAllowed) {
      return excludedRoads.filter((r) => r.kind === "Height" || r.kind === "Hazmat").map((r) => r);
    }
    return excludedRoads.map((r) => r);
  },
};

/**
 * PROFILE-DRIVEN LEGALITY.
 * Anything pulling a trailer is held to blue-shield interstate and white-shield
 * legal county highway. A van-class unit may use county and back roads, so its
 * route keeps the short connectors a trailer route drops.
 */
export function legalFor(route: TruckRoute, profile: TruckProfile): TruckRoute {
  const rules = rulesFor(profile);
  const segments = route.segments.filter(
    (s) => s.truckLegal && rules.allowedClasses.includes(s.class),
  );
  return {
    ...route,
    segments,
    label: rules.backRoadsAllowed ? `${route.label} · shortest legal line` : route.label,
    provider: `${route.provider} · ${profile.label} profile`,
  };
}

/** Swap this line for a HERE/Trimble implementation when going live. */
export const truckRouting: TruckRoutingProvider = mockTruckRoutingProvider;


/** Straight-line off-route test. Real providers return a corridor offset in meters. */
export function metersOffRoute(p: LatLng, polyline: LatLng[]) {
  let best = Number.POSITIVE_INFINITY;
  for (const v of polyline) {
    const dx = (p.lng - v.lng) * 91000;
    const dy = (p.lat - v.lat) * 111000;
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}
