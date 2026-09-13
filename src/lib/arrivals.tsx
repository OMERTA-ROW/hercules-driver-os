import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from "react";
import { announceAt, pickCourier, pickTech } from "@/data/arrivals";
import { serviceOf, type ServiceId } from "@/data/delivery";

/**
 * INBOUND ARRIVAL NOTIFICATIONS
 * -------------------------------------------------------------------------
 * One tracker for anything coming TO the truck: a delivery courier or a
 * mechanic / roadside technician. HERCULES speaks the countdown unprompted —
 * the driver may be sleeping in the bunk or under the hood, so nothing here
 * requires looking at a screen.
 *
 * MECHANIC ETA TIMER: when a provider quotes a window on the phone ("about an
 * hour"), HERCULES starts its own timer from that quote automatically. Five
 * minutes before it expires it prompts the driver and offers to follow up; if
 * the window passes with nobody there it flags it and offers to call again or
 * find someone else.
 *
 * DRIVER APPROVED: this layer only watches the clock and talks. It never
 * calls anyone, never re-dispatches and never spends a cent on its own.
 *
 * A live integration replaces the mock clock with courier-tracking webhooks
 * and the provider's dispatch ETA feed.
 */

/** Mock clock: one simulated minute of approach per 5 real seconds. */
export const MS_PER_MIN = 5_000;

export type ArrivalKind = "delivery" | "mechanic";

export type Arrival = {
  id: string;
  kind: ArrivalKind;
  /** Courier or technician name — spoken in every notification. */
  who: string;
  /** Service or company name. */
  org: string;
  /** Logo source for delivery arrivals. */
  service?: ServiceId;
  /** What they are bringing / coming for. */
  what: string;
  vehicle?: string;
  phone?: string;
  /** Epoch ms when they are expected. */
  arriveAt: number;
  /** Minutes the provider quoted on the call, when one was captured. */
  quotedMin?: number;
  quotedEndsAt?: number;
  status: "inbound" | "arrived" | "overdue";
  /** Thresholds already spoken, so nothing is repeated. */
  spoken: number[];
  /** Five-minute-out follow-up offer already made. */
  prompted?: boolean;
  createdAt: number;
};

export type Announcement = { id: string; text: string; arrivalId: string };

export function minutesOut(a: Arrival, now: number) {
  return (a.arriveAt - now) / MS_PER_MIN;
}

function orderPhrase(a: Arrival) {
  return a.kind === "delivery" ? `your order from ${a.what}` : a.what;
}

function line(a: Arrival, threshold: number) {
  const who = a.who;
  const org = a.kind === "delivery" ? ` on ${a.org}` : ` from ${a.org}`;
  if (threshold === 0) {
    return a.kind === "delivery"
      ? `${who} is right outside with ${orderPhrase(a)}. ${a.vehicle ? `${a.vehicle}. ` : ""}Walk out when you're ready.`
      : `${who}${org} is here for ${orderPhrase(a)}. ${a.vehicle ? `${a.vehicle}. ` : ""}He's pulling in now.`;
  }
  const mins = threshold === 1 ? "one minute" : `${threshold} minutes`;
  return a.kind === "delivery"
    ? `${who} is ${mins} out with ${orderPhrase(a)}${org}.${a.vehicle ? ` ${a.vehicle}.` : ""}`
    : `${who}${org} is ${mins} out for ${orderPhrase(a)}.`;
}

const KEY = "hercules.arrivals";

type Ctx = {
  arrivals: Arrival[];
  /** Anything still coming, soonest first. */
  inbound: Arrival[];
  now: number;
  expectDelivery: (input: {
    service: ServiceId;
    vendor: string;
    etaMin: number;
    summary?: string;
  }) => Arrival;
  expectMechanic: (input: {
    company: string;
    reason: string;
    etaMin: number;
    phone?: string;
    tech?: string;
  }) => Arrival;
  /** Start the HERCULES timer from a quote the driver was given on the call. */
  setQuote: (id: string, minutes: number) => void;
  markArrived: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  /** Pull the next spoken notification, if any. */
  takeAnnouncement: () => Announcement | null;
};

/**
 * Keep one context identity across dev hot-reloads. This module mixes a
 * provider with helpers, so Fast Refresh sometimes re-evaluates it and would
 * otherwise mint a second context — the provider above would then be invisible
 * to consumers below it ("must be used inside ArrivalsProvider").
 */
const g = globalThis as { __herculesArrivalsCtx?: Context<Ctx | null> };
const ArrivalsContext = (g.__herculesArrivalsCtx ??= createContext<Ctx | null>(null));

let seq = 0;
const nextId = () => `arr${++seq}-${Date.now()}`;

export function ArrivalsProvider({ children }: { children: ReactNode }) {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const queue = useRef<Announcement[]>([]);
  const [, bump] = useState(0);

  /* Restore anything still in flight from a previous screen or reload. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Arrival[];
      setArrivals(parsed.filter((a) => Date.now() - a.createdAt < 6 * 60 * 60 * 1000));
    } catch {
      /* ignore unreadable state */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(arrivals));
    } catch {
      /* storage full or unavailable — tracking still works in memory */
    }
  }, [arrivals]);

  const push = useCallback((arrivalId: string, text: string) => {
    queue.current.push({ id: nextId(), text, arrivalId });
    bump((n) => n + 1);
  }, []);

  /* The clock. Every tick checks each arrival for something worth saying. */
  useEffect(() => {
    if (arrivals.length === 0) return;
    const t = setInterval(() => {
      const t0 = Date.now();
      setNow(t0);
      setArrivals((prev) =>
        prev.map((a) => {
          if (a.status !== "inbound") return a;
          let next = a;
          const out = minutesOut(a, t0);

          /* Quoted-window prompt — five minutes before the quote runs out. */
          if (
            a.kind === "mechanic" &&
            a.quotedEndsAt &&
            !a.prompted &&
            a.quotedEndsAt - t0 <= 5 * MS_PER_MIN
          ) {
            next = { ...next, prompted: true };
            push(
              a.id,
              `Heads up — the ${a.quotedMin} minute window ${a.who} gave you is nearly up, about five minutes left. Want me to follow up and see if he's still coming?`,
            );
          }

          /* Countdown notifications. */
          for (const th of announceAt) {
            if (out <= th && !next.spoken.includes(th)) {
              next = { ...next, spoken: [...next.spoken, th] };
              push(a.id, line(a, th));
            }
          }

          /* Quote blew past with nobody here — flag it, offer the next move. */
          if (out < -1 && next.status === "inbound") {
            next = { ...next, status: "overdue" };
            push(
              a.id,
              a.kind === "mechanic"
                ? `${a.who} from ${a.org} is past the ${a.quotedMin ?? "quoted"} minute window he gave you and nobody has shown up. Want me to call him again, or pull up the next provider that handles ${a.what}?`
                : `${a.who} is past the delivery window on ${a.org} and nothing has reached the truck. Want me to check the order or start a refund?`,
            );
          }
          return next;
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, [arrivals.length, push]);

  const expectDelivery = useCallback<Ctx["expectDelivery"]>((input) => {
    const courier = pickCourier(input.service, Date.now());
    const a: Arrival = {
      id: nextId(),
      kind: "delivery",
      who: courier.name,
      org: serviceOf(input.service).name,
      service: input.service,
      what: input.vendor,
      vehicle: courier.plate ? `${courier.vehicle}, plate ${courier.plate}` : courier.vehicle,
      arriveAt: Date.now() + input.etaMin * MS_PER_MIN,
      status: "inbound",
      spoken: [],
      createdAt: Date.now(),
    };
    setArrivals((prev) => [...prev, a]);
    return a;
  }, []);

  const expectMechanic = useCallback<Ctx["expectMechanic"]>((input) => {
    const a: Arrival = {
      id: nextId(),
      kind: "mechanic",
      who: input.tech ?? pickTech(Date.now()),
      org: input.company,
      what: input.reason,
      arriveAt: Date.now() + input.etaMin * MS_PER_MIN,
      quotedMin: input.etaMin,
      quotedEndsAt: Date.now() + input.etaMin * MS_PER_MIN,
      status: "inbound",
      spoken: [],
      createdAt: Date.now(),
      ...(input.phone ? { phone: input.phone } : {}),
    };
    setArrivals((prev) => [...prev, a]);
    return a;
  }, []);

  const setQuote = useCallback((id: string, minutes: number) => {
    const ends = Date.now() + minutes * MS_PER_MIN;
    setArrivals((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              quotedMin: minutes,
              quotedEndsAt: ends,
              arriveAt: ends,
              status: "inbound",
              prompted: false,
              spoken: [],
            }
          : a,
      ),
    );
  }, []);

  const markArrived = useCallback((id: string) => {
    setArrivals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "arrived" } : a)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setArrivals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => setArrivals([]), []);

  const takeAnnouncement = useCallback(() => queue.current.shift() ?? null, []);

  const inbound = useMemo(
    () => arrivals.filter((a) => a.status !== "arrived").sort((x, y) => x.arriveAt - y.arriveAt),
    [arrivals],
  );

  const value: Ctx = {
    arrivals,
    inbound,
    now,
    expectDelivery,
    expectMechanic,
    setQuote,
    markArrived,
    dismiss,
    clearAll,
    takeAnnouncement,
  };

  return <ArrivalsContext.Provider value={value}>{children}</ArrivalsContext.Provider>;
}

export function useArrivals() {
  const ctx = useContext(ArrivalsContext);
  if (!ctx) throw new Error("useArrivals must be used inside ArrivalsProvider");
  return ctx;
}

/** "12 min" / "2 min" / "now" — shared by the card and the breakdown timer. */
export function countdownLabel(a: Arrival, now: number) {
  if (a.status === "arrived") return "arrived";
  const out = minutesOut(a, now);
  if (out <= 0.2) return a.status === "overdue" ? "overdue" : "now";
  if (out < 1) return "under a minute";
  return `${Math.ceil(out)} min`;
}
