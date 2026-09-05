/**
 * THE BOLT stream layer.
 *
 * `BoltProvider` owns connection state, the pairing flow and the live value
 * feed. Today the feed is a mock ticker; a real adapter implements the same
 * `BoltAdapter` seam over Web Bluetooth + J1939 decoding and nothing above
 * this file changes.
 */
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
  boltAutoAlerts,
  boltBaseline,
  boltFaults,
  boltPredictions,
  boltTires,
  type FaultFrame,
  type LiveValue,
} from "@/data/bolt";

export type BoltState = "not-detected" | "pairing" | "paired" | "connected";

export type BoltSnapshot = {
  values: LiveValue[];
  faults: FaultFrame[];
  tires: typeof boltTires;
  predictions: typeof boltPredictions;
};

export type BoltAdapter = {
  /** Discover + pair the nine-pin reader over Bluetooth. */
  pair: () => Promise<boolean>;
  /** Latest decoded J1939 frame set. */
  read: () => BoltSnapshot;
};

function jitter(v: LiveValue, tick: number): LiveValue {
  if (v.key === "rpm") {
    const rpm = 1380 + Math.round(Math.sin(tick / 3) * 60);
    return { ...v, value: rpm.toLocaleString() };
  }
  if (v.key === "coolant") {
    const t = 212 + (tick % 5);
    return { ...v, value: String(t), status: t >= 215 ? "alert" : "watch" };
  }
  if (v.key === "mpg") {
    return { ...v, value: (7.2 + ((tick % 5) * 0.1)).toFixed(1) };
  }
  if (v.key === "volts") {
    return { ...v, value: (13.8 + ((tick % 3) * 0.1)).toFixed(1) };
  }
  return v;
}

/** Mock adapter — replace with the Bluetooth J1939 implementation. */
export const mockBoltAdapter: BoltAdapter = {
  pair: () => new Promise((res) => setTimeout(() => res(true), 1600)),
  read: () => ({
    values: boltBaseline,
    faults: boltFaults,
    tires: boltTires,
    predictions: boltPredictions,
  }),
};

/** Non-React snapshot for the voice engine and Breakdown Assist. */
export function boltSnapshot(): BoltSnapshot {
  return mockBoltAdapter.read();
}

export function boltSpokenSummary(): string {
  const faults = boltFaults;
  if (!faults.length) return "THE BOLT isn't reporting a single fault. Your truck is clean.";
  return `THE BOLT has ${faults.length} active ${
    faults.length === 1 ? "code" : "codes"
  }. ${faults.map((f) => f.plain).join(" ")}`;
}

type Ctx = {
  state: BoltState;
  signal: number;
  snapshot: BoltSnapshot;
  /** Alerts HERCULES raised on its own from the stream. */
  autoAlerts: { id: string; severity: "watch" | "alert"; spoken: string }[];
  dismissAlert: (id: string) => void;
  startPairing: () => Promise<void>;
  disconnect: () => void;
};

const BoltContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "hercules.bolt.paired";

export function BoltProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BoltState>("not-detected");
  const [tick, setTick] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const started = useRef(0);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setState("connected");
      started.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (state !== "connected") return;
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, [state]);

  const startPairing = useCallback(async () => {
    setState("pairing");
    const ok = await mockBoltAdapter.pair();
    if (ok) {
      localStorage.setItem(STORAGE_KEY, "1");
      started.current = Date.now();
      setState("connected");
    } else setState("not-detected");
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState("not-detected");
  }, []);

  const snapshot = useMemo<BoltSnapshot>(() => {
    const base = mockBoltAdapter.read();
    if (state !== "connected") return base;
    return { ...base, values: base.values.map((v) => jitter(v, tick)) };
  }, [state, tick]);

  const elapsed = state === "connected" ? tick * 1.2 : 0;
  const autoAlerts = useMemo(
    () =>
      boltAutoAlerts
        .filter((a) => elapsed >= a.atSecond && !dismissed.includes(a.id))
        .map((a) => ({ id: a.id, severity: a.severity, spoken: a.spoken })),
    [elapsed, dismissed],
  );

  const dismissAlert = useCallback(
    (id: string) => setDismissed((prev) => [...prev, id]),
    [],
  );

  const signal = state === "connected" ? 3 + (tick % 2) : 0;

  return (
    <BoltContext.Provider
      value={{ state, signal, snapshot, autoAlerts, dismissAlert, startPairing, disconnect }}
    >
      {children}
    </BoltContext.Provider>
  );
}

export function useBolt() {
  const ctx = useContext(BoltContext);
  if (!ctx) throw new Error("useBolt must be used inside BoltProvider");
  return ctx;
}
