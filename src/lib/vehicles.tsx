/**
 * ACTIVE EQUIPMENT FOR THIS TRIP.
 *
 * The saved profiles live on the driver's account. The ACTIVE profile is chosen
 * per trip: if the driver has more than one piece of equipment, HERCULES asks
 * at the start of every trip — "What are you in today?" — and every routing and
 * hazard decision downstream reads the answer from here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultProfile,
  makeProfile,
  rulesFor,
  type EighteenSub,
  type RoutingRules,
  type VehicleKind,
  type VehicleProfile,
} from "@/data/vehicles";

const PROFILE_KEY = "hercules.vehicles";
const ACTIVE_KEY = "hercules.vehicle.active";
/** Trip stamp — a new trip means the question gets asked again. */
const TRIP_KEY = "hercules.vehicle.trip";

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

type Ctx = {
  profiles: VehicleProfile[];
  active: VehicleProfile;
  rules: RoutingRules;
  /** True when the driver has several units and hasn't answered for this trip. */
  askForTrip: boolean;
  chooseForTrip: (id: string) => void;
  dismissTripPrompt: () => void;
  addProfile: (kind: VehicleKind, sub: EighteenSub | undefined, unit: string) => void;
  removeProfile: (id: string) => void;
  ready: boolean;
};

const VehicleContext = createContext<Ctx | null>(null);

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<VehicleProfile[]>([defaultProfile]);
  const [activeId, setActiveId] = useState<string>(defaultProfile.id);
  const [answeredTrip, setAnsweredTrip] = useState<string | null>(todayStamp());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const saved = raw ? (JSON.parse(raw) as VehicleProfile[]) : null;
      if (saved && saved.length) setProfiles(saved);
      const a = localStorage.getItem(ACTIVE_KEY);
      if (a) setActiveId(a);
      setAnsweredTrip(localStorage.getItem(TRIP_KEY));
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: VehicleProfile[]) => {
    setProfiles(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0] ?? defaultProfile,
    [profiles, activeId],
  );

  const value = useMemo<Ctx>(() => {
    return {
      profiles,
      active,
      rules: rulesFor(active),
      ready,
      askForTrip: ready && profiles.length > 1 && answeredTrip !== todayStamp(),
      chooseForTrip: (id) => {
        setActiveId(id);
        setAnsweredTrip(todayStamp());
        try {
          localStorage.setItem(ACTIVE_KEY, id);
          localStorage.setItem(TRIP_KEY, todayStamp());
        } catch {
          /* ignore */
        }
      },
      dismissTripPrompt: () => {
        setAnsweredTrip(todayStamp());
        try {
          localStorage.setItem(TRIP_KEY, todayStamp());
        } catch {
          /* ignore */
        }
      },
      addProfile: (kind, sub, unit) => {
        const next = [...profiles, makeProfile(kind, sub, unit)];
        persist(next);
        try {
          // A second unit on the account means the trip question starts firing.
          localStorage.removeItem(TRIP_KEY);
        } catch {
          /* ignore */
        }
        setAnsweredTrip(null);
      },
      removeProfile: (id) => {
        const next = profiles.filter((p) => p.id !== id);
        persist(next.length ? next : [defaultProfile]);
        if (id === activeId) setActiveId((next[0] ?? defaultProfile).id);
      },
    };
  }, [profiles, active, activeId, answeredTrip, ready, persist]);

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicle(): Ctx {
  const ctx = useContext(VehicleContext);
  if (ctx)  return ctx;
  return {
    profiles: [defaultProfile],
    active: defaultProfile,
    rules: rulesFor(defaultProfile),
    askForTrip: false,
    chooseForTrip: () => {},
    dismissTripPrompt: () => {},
    addProfile: () => {},
    removeProfile: () => {},
    ready: false,
  };
}
