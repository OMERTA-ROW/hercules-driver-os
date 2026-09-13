/**
 * THE BOLT stream layer.
 *
 * `BoltProvider` owns connection state, the pairing flow and the live value
 * feed — for BOTH adapter families. Which family is live follows the driver's
 * equipment profile: a heavy tractor reads the nine-pin J1939 bus, a van, car or
 * hotshot pickup reads the sixteen-pin OBD-II bus. The snapshot only ever
 * carries what that bus can actually report, so screens never show empty fields.
 *
 * THERE IS NO ENGINE FEED YET. No adapter hardware is talking to this app, so
 * this layer reports nothing rather than inventing readings: `state` stays
 * "unavailable", every list is empty, and screens say plainly that engine
 * diagnostics are not connected. A real Web Bluetooth reader implements the same
 * `BoltAdapter` seam and nothing above this file changes.
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

export type BoltState = "unavailable" | "not-detected" | "pairing" | "paired" | "connected";

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

/**
 * No hardware adapter exists in this build, so nothing can be read. Every
 * reader below returns an empty frame set — never a fabricated value.
 */
export const noHardwareAdapter: BoltAdapter = {
  pair: () => Promise.resolve(false),
  read: (kind) => ({ kind, values: [], faults: [], tires: [], predictions: [], readiness: [] }),
};

/** Shown wherever engine data would appear. */
export const BOLT_UNAVAILABLE =
  "Engine diagnostics are not connected. No reader is paired to this app yet, so nothing is being measured — anything shown here would be made up.";

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
  return noHardwareAdapter.read(kind);
}

/** Fault frames off whichever diagnostics source is active. */
export function activeFaults(): FaultFrame[] {
  return [];
}

export function activePredictions(): Prediction[] {
  return [];
}

export function activeAdapter(): AdapterProduct {
  return adapters[activeAdapterKind()];
}

export function boltSpokenSummary(kind: AdapterKind = activeAdapterKind()): string {
  const product = adapters[kind];
  return `I can't read your engine. No ${product.name} is talking to this app, so I have no codes and no readings — I will not guess at them.`;
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

  const [state, setState] = useState<BoltState>("unavailable");
  const [dismissed, setDismissed] = useState<string[]>([]);

  /* The active bus follows the equipment profile — remembered for the voice
     engine and other non-React readers. */
  useEffect(() => {
    try {
      localStorage.setItem(KIND_KEY, kind);
    } catch {
      /* ignore */
    }
  }, [kind]);

  // Any previously remembered "paired" flag is cleared: nothing can be paired
  // while no reader hardware is supported.
  useEffect(() => {
    try {
      localStorage.removeItem(pairedKey(kind));
    } catch {
      /* ignore */
    }
    setState("unavailable");
    setDismissed([]);
  }, [kind]);

  const startPairing = useCallback(async () => {
    setState("pairing");
    const ok = await noHardwareAdapter.pair(kind);
    setState(ok ? "connected" : "unavailable");
  }, [kind]);

  const disconnect = useCallback(() => setState("unavailable"), []);

  const snapshot = useMemo<BoltSnapshot>(() => noHardwareAdapter.read(kind), [kind]);

  // No stream, so no automatic alerts. Nothing is raised from nothing.
  const autoAlerts = useMemo<{ id: string; severity: "watch" | "alert"; spoken: string }[]>(
    () => [],
    [],
  );

  const dismissAlert = useCallback((id: string) => setDismissed((prev) => [...prev, id]), []);

  const signal = 0;

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
