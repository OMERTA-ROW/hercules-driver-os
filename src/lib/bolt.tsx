/**
 * THE BOLT stream layer.
 *
 * `BoltProvider` owns connection state, the pairing flow and the live value
 * feed — for BOTH adapter families. Which family is live follows the driver's
 * equipment profile: a heavy tractor reads the nine-pin J1939 bus, a van, car or
 * hotshot pickup reads the sixteen-pin OBD-II bus. The snapshot only ever
 * carries what that bus can actually report, so screens never show empty fields.
 *
 * The feed is a mock ticker today; a real adapter implements the same
 * `BoltAdapter` seam over Web Bluetooth and nothing above this file changes.
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
  adapterForSpec,
  adapters,
  autoAlertsFor,
  baselineFor,
  boltTires,
  faultsFor,
  obdReadiness,
  predictionsFor,
  type AdapterKind,
  type AdapterProduct,
  type FaultFrame,
  type LiveValue,
  type Prediction,
  type ReadinessMonitor,
  type TireFrame,
} from "@/data/bolt";
import { useVehicle } from "./vehicles";

export type BoltState = "not-detected" | "pairing" | "paired" | "connected";

export type BoltSnapshot = {
  kind: AdapterKind;
  values: LiveValue[];
  faults: FaultFrame[];
  /** Empty on buses without commercial TPMS — hide the panel, don't blank it. */
  tires: TireFrame[];
  predictions: Prediction[];
  /** Empty on J1939 — emissions readiness is an OBD-II concept. */
  readiness: ReadinessMonitor[];
};

export type BoltAdapter = {
  /** Discover + pair the reader over Bluetooth. */
  pair: (kind: AdapterKind) => Promise<boolean>;
  /** Latest decoded frame set for that bus. */
  read: (kind: AdapterKind) => BoltSnapshot;
};

function jitter(v: LiveValue, tick: number): LiveValue {
  if (v.key === "rpm") {
    const base = Number(v.value.replace(/,/g, "")) || 1400;
    return { ...v, value: (base + Math.round(Math.sin(tick / 3) * 60)).toLocaleString() };
  }
  if (v.key === "coolant") {
    const t = Number(v.value) + (tick % 5) - 2;
    return { ...v, value: String(t) };
  }
  if (v.key === "mpg") {
    return { ...v, value: (Number(v.value) + ((tick % 5) * 0.1 - 0.2)).toFixed(1) };
  }
  if (v.key === "volts") {
    return { ...v, value: (13.8 + ((tick % 3) * 0.1)).toFixed(1) };
  }
  return v;
}

/** Mock adapter — replace with the Bluetooth J1939 / OBD-II implementation. */
export const mockBoltAdapter: BoltAdapter = {
  pair: () => new Promise((res) => setTimeout(() => res(true), 1600)),
  read: (kind) => ({
    kind,
    values: baselineFor(kind),
    faults: faultsFor(kind),
    tires: adapters[kind].hasTires ? boltTires : [],
    predictions: predictionsFor(kind),
    readiness: adapters[kind].hasReadiness ? obdReadiness : [],
  }),
};

const KIND_KEY = "hercules.bolt.kind";
const pairedKey = (kind: AdapterKind) => `hercules.bolt.paired.${kind}`;

/** Which bus is live for the driver's current equipment, outside React. */
export function activeAdapterKind(): AdapterKind {
  try {
    const raw = localStorage.getItem(KIND_KEY);
    if (raw === "j1939" || raw === "obd2") return raw;
  } catch {
    /* ignore */
  }
  return "j1939";
}

/** Non-React snapshot for the voice engine and Breakdown Assist. */
export function boltSnapshot(kind: AdapterKind = activeAdapterKind()): BoltSnapshot {
  return mockBoltAdapter.read(kind);
}

/** Fault frames off whichever diagnostics source is active. */
export function activeFaults(): FaultFrame[] {
  return faultsFor(activeAdapterKind());
}

export function activePredictions(): Prediction[] {
  return predictionsFor(activeAdapterKind());
}

export function activeAdapter(): AdapterProduct {
  return adapters[activeAdapterKind()];
}

export function boltSpokenSummary(kind: AdapterKind = activeAdapterKind()): string {
  const product = adapters[kind];
  const faults = faultsFor(kind);
  if (!faults.length) return `${product.name} isn't reporting a single fault. You're clean.`;
  return `${product.name} has ${faults.length} active ${
    faults.length === 1 ? "code" : "codes"
  }. ${faults.map((f) => f.plain).join(" ")}`;
}

type Ctx = {
  state: BoltState;
  signal: number;
  snapshot: BoltSnapshot;
  /** The adapter family this vehicle profile needs. */
  kind: AdapterKind;
  adapter: AdapterProduct;
  /** Why that family, in plain language. */
  reason: string;
  /** Alerts HERCULES raised on its own from the stream. */
  autoAlerts: { id: string; severity: "watch" | "alert"; spoken: string }[];
  dismissAlert: (id: string) => void;
  startPairing: () => Promise<void>;
  disconnect: () => void;
};

const BoltContext = createContext<Ctx | null>(null);

export function BoltProvider({ children }: { children: ReactNode }) {
  const { active } = useVehicle();
  const kind = adapterForSpec(active);
  const adapter = adapters[kind];

  const [state, setState] = useState<BoltState>("not-detected");
  const [tick, setTick] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const started = useRef(0);

  /* The active bus follows the equipment profile — remembered for the voice
     engine and other non-React readers. */
  useEffect(() => {
    try {
      localStorage.setItem(KIND_KEY, kind);
    } catch {
      /* ignore */
    }
  }, [kind]);

  useEffect(() => {
    try {
      if (localStorage.getItem(pairedKey(kind)) === "1") {
        setState("connected");
        started.current = Date.now();
      } else setState("not-detected");
    } catch {
      /* ignore */
    }
    setTick(0);
    setDismissed([]);
  }, [kind]);

  useEffect(() => {
    if (state !== "connected") return;
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, [state]);

  const startPairing = useCallback(async () => {
    setState("pairing");
    const ok = await mockBoltAdapter.pair(kind);
    if (ok) {
      try {
        localStorage.setItem(pairedKey(kind), "1");
      } catch {
        /* ignore */
      }
      started.current = Date.now();
      setState("connected");
    } else setState("not-detected");
  }, [kind]);

  const disconnect = useCallback(() => {
    try {
      localStorage.removeItem(pairedKey(kind));
    } catch {
      /* ignore */
    }
    setState("not-detected");
  }, [kind]);

  const snapshot = useMemo<BoltSnapshot>(() => {
    const base = mockBoltAdapter.read(kind);
    if (state !== "connected") return base;
    return { ...base, values: base.values.map((v) => jitter(v, tick)) };
  }, [kind, state, tick]);

  const elapsed = state === "connected" ? tick * 1.2 : 0;
  const autoAlerts = useMemo(
    () =>
      autoAlertsFor(kind)
        .filter((a) => elapsed >= a.atSecond && !dismissed.includes(a.id))
        .map((a) => ({ id: a.id, severity: a.severity, spoken: a.spoken })),
    [kind, elapsed, dismissed],
  );

  const dismissAlert = useCallback(
    (id: string) => setDismissed((prev) => [...prev, id]),
    [],
  );

  const signal = state === "connected" ? 3 + (tick % 2) : 0;

  const reason =
    kind === "j1939"
      ? `${active.label} — your engine talks on the J1939 bus through the nine-pin port.`
      : `${active.label} — your engine talks on the standard sixteen-pin OBD-II port.`;

  return (
    <BoltContext.Provider
      value={{
        state,
        signal,
        snapshot,
        kind,
        adapter,
        reason,
        autoAlerts,
        dismissAlert,
        startPairing,
        disconnect,
      }}
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
