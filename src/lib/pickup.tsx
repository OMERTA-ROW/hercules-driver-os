import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  driveMinutesTo,
  pickupSiteFor,
  readinessFor,
  spokenSite,
  supplierName,
  willMakeCounter,
  type PickupSite,
} from "@/data/pickup";
import { categoryById, type Listing } from "@/data/parts";
import { hazardLayer, effectiveSeverity, relevantToVehicle } from "@/lib/hazard-layer";
import { truckRouting } from "@/lib/truck-routing";
import { useVehicle } from "@/lib/vehicles";
import { primaryRoute } from "@/data/routing";
import type { PlacedSupplyOrder } from "@/lib/parts";

/**
 * PART PICKUP ROUTING
 * -------------------------------------------------------------------------
 * A part bought for collection is a trip, not a line on a receipt. The moment
 * an order is placed for pickup, HERCULES works out the truck-legal route to
 * that counter — respecting the active equipment profile, bridge clearances,
 * legal road classes and the hazard layer — and OFFERS it. The driver never
 * looks a supplier up by hand.
 *
 * DRIVER APPROVED: the route is offered. Nothing is dispatched, and no
 * navigation is taken over, until the driver says yes. `approve()` is the only
 * function that dispatches, and it is only ever called from an explicit tap or
 * a spoken yes.
 *
 * HELD ROUTES: if the part is not on the shelf yet, the route is held rather
 * than pushed at the driver, and HERCULES brings it up once the counter has it.
 *
 * A live integration replaces the mock clock with the supplier's promised-ready
 * feed and the real GPS position feed.
 */

/** Mock clock: one simulated minute per 5 real seconds, same as arrivals. */
export const MS_PER_MIN = 5_000;

export type PickupStatus = "held" | "offered" | "routed" | "collected" | "declined";

export type PickupRun = {
  id: string;
  orderId: string;
  label: string;
  partNumber?: string;
  vendor: string;
  supplierId: string;
  site: PickupSite;
  ready: string;
  /** Epoch ms when the counter will have it; now-or-earlier means ready. */
  readyAt: number;
  status: PickupStatus;
  /** Drive time to the counter, in simulated minutes. */
  driveMin: number;
  /** Set once the driver approves — the dispatched truck-legal route. */
  route?: {
    label: string;
    miles: number;
    provider: string;
    profile: string;
    /** Hazards on the way in that actually threaten this unit. */
    hazards: { name: string; detail: string }[];
    dispatchedAt: number;
    /** Epoch ms the truck is due at the counter. */
    dueAt: number;
  };
  /** Reminder thresholds already spoken, so nothing repeats. */
  spoken: string[];
  createdAt: number;
};

export type PickupAnnouncement = { id: string; text: string; runId: string };

const KEY = "hercules.pickup.runs";

/** Categories that never involve driving to a counter. */
function isPickupOrder(o: PlacedSupplyOrder) {
  if (o.status !== "placed") return false;
  if (o.comesToYou) return false;
  if (o.category === "permits" || o.category === "roadside") return false;
  if (o.listing?.milesAhead === undefined) return false;
  return o.listing.milesAhead > 0;
}

type Ctx = {
  runs: PickupRun[];
  /** The run the driver has dispatched, if any. */
  activeRun: PickupRun | null;
  /** Anything waiting on the driver's yes. */
  pendingRun: PickupRun | null;
  now: number;
  /** Called on order confirmation — builds the offer, never dispatches. */
  offer: (order: PlacedSupplyOrder) => PickupRun | null;
  /** DRIVER APPROVED ONLY — dispatches the truck-legal route to the counter. */
  approve: (id: string) => Promise<PickupRun | null>;
  decline: (id: string) => void;
  collected: (id: string) => void;
  minutesOut: (run: PickupRun) => number;
  takeAnnouncement: () => PickupAnnouncement | null;
  ready: boolean;
};

const PickupContext = createContext<Ctx | null>(null);

export function PickupProvider({ children }: { children: ReactNode }) {
  const { active: vehicle } = useVehicle();
  const [runs, setRuns] = useState<PickupRun[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const queue = useRef<PickupAnnouncement[]>([]);
  const runsRef = useRef<PickupRun[]>([]);
  runsRef.current = runs;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRuns(JSON.parse(raw) as PickupRun[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: PickupRun[]) => {
    setRuns(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const push = useCallback((runId: string, text: string) => {
    queue.current = [...queue.current, { id: `pa-${Date.now()}-${Math.random()}`, text, runId }];
  }, []);

  /* ---------------------------------------------------------------- OFFER */

  const offer = useCallback(
    (order: PlacedSupplyOrder) => {
      if (!isPickupOrder(order)) return null;
      if (runsRef.current.some((r) => r.orderId === order.id)) return null;

      const listing: Listing = order.listing;
      const site = pickupSiteFor(listing);
      const readiness = readinessFor(listing);
      const driveMin = driveMinutesTo(site);
      const run: PickupRun = {
        id: `pu-${order.id}`,
        orderId: order.id,
        label: order.label,
        ...(order.partNumber ? { partNumber: order.partNumber } : {}),
        vendor: order.vendor,
        supplierId: order.supplierId,
        site,
        ready: readiness.text,
        readyAt: Date.now() + readiness.inMinutes * MS_PER_MIN,
        status: readiness.readyNow ? "offered" : "held",
        driveMin,
        spoken: [],
        createdAt: Date.now(),
      };
      persist([run, ...runsRef.current]);

      const counter = `${site.counter}. ${site.parking}.`;
      if (readiness.readyNow) {
        const late = willMakeCounter(site, driveMin)
          ? ""
          : ` One thing — you'd get there after they close. ${site.hours}.`;
        push(
          run.id,
          `${order.label} is paid for at ${order.vendor}. It's ready now. I've built you a truck-legal route in — ${site.milesAhead} miles ahead, ${site.milesOffRoute.toFixed(
            1,
          )} off the mainline, about ${driveMin} minutes. ${counter}${late} Say the word and I'll put it on the map. I'm not moving your navigation until you do.`,
        );
      } else {
        push(
          run.id,
          `${order.label} is paid for at ${order.vendor}, but the counter doesn't have it yet — ${readiness.text}. I'm holding the route and I'll bring it straight back to you the moment it's ready. ${counter}`,
        );
      }
      return run;
    },
    [persist, push],
  );

  /* -------------------------------------------------------------- APPROVE */

  const approve = useCallback(
    async (id: string) => {
      const run = runsRef.current.find((r) => r.id === id);
      if (!run) return null;

      // Truck-legal geometry for the ACTIVE equipment profile: legal road
      // classes only, clearances and weight limits respected.
      const legal = await truckRouting.route({
        from: primaryRoute.polyline[0]!,
        to: run.site.at,
        profile: vehicle,
      });
      const all = await hazardLayer.hazardsAhead({ profile: vehicle });
      const hazards = all
        .filter(
          (h) =>
            relevantToVehicle(h, vehicle) &&
            h.milesAhead <= run.site.milesAhead &&
            effectiveSeverity(h, vehicle) !== "info",
        )
        .slice(0, 4)
        .map((h) => ({ name: h.name, detail: h.detail }));

      const next: PickupRun = {
        ...run,
        status: "routed",
        route: {
          label: `${legal.label} · ${run.site.name}`,
          miles: run.site.milesAhead + run.site.milesOffRoute,
          provider: legal.provider,
          profile: vehicle.label,
          hazards,
          dispatchedAt: Date.now(),
          dueAt: Date.now() + run.driveMin * MS_PER_MIN,
        },
        spoken: [...run.spoken, "dispatched"],
      };
      persist(runsRef.current.map((r) => (r.id === id ? next : r)));

      const hazardLine = hazards.length
        ? ` On the way in: ${hazards.map((h) => h.name).join(", ")}. I'll call each one out before you get to it.`
        : " Nothing on the hazard layer between you and it.";
      push(
        next.id,
        `Route's on the map — ${run.site.name}, about ${run.driveMin} minutes. Legal the whole way for your ${vehicle.label}.${hazardLine} ${run.site.counter}.`,
      );
      return next;
    },
    [persist, push, vehicle],
  );

  const decline = useCallback(
    (id: string) => {
      persist(runsRef.current.map((r) => (r.id === id ? { ...r, status: "declined" } : r)));
    },
    [persist],
  );

  const collected = useCallback(
    (id: string) => {
      persist(runsRef.current.map((r) => (r.id === id ? { ...r, status: "collected" } : r)));
    },
    [persist],
  );

  /* ------------------------------------------------------ CLOCK + REMINDERS */

  useEffect(() => {
    const t = setInterval(() => {
      const stamp = Date.now();
      setNow(stamp);

      let changed = false;
      const next = runsRef.current.map((r) => {
        if (r.status === "collected" || r.status === "declined") return r;
        const spoken = [...r.spoken];
        const mark = (k: string) => {
          spoken.push(k);
          changed = true;
        };

        // Held route: the counter now has it — bring it back to the driver once.
        if (r.status === "held" && stamp >= r.readyAt && !spoken.includes("ready")) {
          mark("ready");
          push(
            r.id,
            `Your ${r.label} is ready at ${r.vendor} now. ${spokenSite(
              r.site,
            )} Want the route? I'll hold off until you say so.`,
          );
          return { ...r, status: "offered" as PickupStatus, spoken };
        }

        if (r.status !== "routed" || !r.route)
          return spoken.length === r.spoken.length ? r : { ...r, spoken };

        const minsOut = (r.route.dueAt - stamp) / MS_PER_MIN;

        // Pickup window closing in — spoken well before he needs to exit.
        if (minsOut <= 15 && minsOut > 5 && !spoken.includes("w15")) {
          mark("w15");
          push(
            r.id,
            `Pickup coming up — ${r.vendor} in about fifteen minutes for the ${r.label}. ${r.site.counter}. ${r.site.parking}.`,
          );
        }
        if (minsOut <= 5 && minsOut > 0 && !spoken.includes("w5")) {
          mark("w5");
          push(
            r.id,
            `${r.vendor} is five minutes out. Your exit is ${r.site.milesOffRoute.toFixed(
              1,
            )} off the mainline. ${r.site.counter}.`,
          );
        }
        // Routing past the supplier without collecting it.
        if (minsOut <= 0 && !spoken.includes("passing")) {
          mark("passing");
          push(
            r.id,
            `You're at ${r.vendor} now, and your ${r.label} is still on their will-call shelf. ${r.site.counter}. ${r.site.hours}. If you'd rather keep rolling, say so and I'll keep it held for you.`,
          );
        }
        if (minsOut <= -20 && !spoken.includes("past")) {
          mark("past");
          push(
            r.id,
            `Heads up — you've routed past ${r.vendor} and the ${r.label} wasn't collected. ${r.site.hours}. Say the word and I'll build the turn-back, or find that part at a counter further up the road.`,
          );
        }
        return spoken.length === r.spoken.length ? r : { ...r, spoken };
      });

      if (changed) persist(next);
    }, 1_000);
    return () => clearInterval(t);
  }, [persist, push]);

  const takeAnnouncement = useCallback(() => {
    const [head, ...rest] = queue.current;
    if (!head) return null;
    queue.current = rest;
    return head;
  }, []);

  const value = useMemo<Ctx>(() => {
    const activeRun = runs.find((r) => r.status === "routed") ?? null;
    const pendingRun = runs.find((r) => r.status === "offered" || r.status === "held") ?? null;
    return {
      runs,
      activeRun,
      pendingRun,
      now,
      offer,
      approve,
      decline,
      collected,
      minutesOut: (run) =>
        run.route ? Math.round((run.route.dueAt - Date.now()) / MS_PER_MIN) : run.driveMin,
      takeAnnouncement,
      ready,
    };
  }, [runs, now, offer, approve, decline, collected, takeAnnouncement, ready]);

  return <PickupContext.Provider value={value}>{children}</PickupContext.Provider>;
}

export function usePickup(): Ctx {
  const ctx = useContext(PickupContext);
  if (!ctx) throw new Error("usePickup must be used inside PickupProvider");
  return ctx;
}

/** Plain-language status for the cards. */
export function pickupStatusLabel(r: PickupRun) {
  if (r.status === "held") return "held — part not ready";
  if (r.status === "offered") return "route offered";
  if (r.status === "routed") return "route dispatched";
  if (r.status === "collected") return "collected";
  return "declined";
}

export { categoryById, supplierName };
