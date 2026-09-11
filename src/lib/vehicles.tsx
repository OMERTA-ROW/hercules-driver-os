/**
 * ACTIVE EQUIPMENT FOR THIS TRIP.
 *
 * The saved profiles live on the driver's account. How the ACTIVE profile gets
 * resolved depends on the size of the operation:
 *
 *  ASKED     — owner-operators and small carriers (roughly ten trucks and
 *              under). Equipment swaps constantly, so HERCULES asks out loud at
 *              the start of every trip: "What are you in today?"
 *  INHERITED — Tier 2 and Tier 3 fleets. The company assigns the truck and
 *              trailer, so HERCULES reads the assignment off the fleet record
 *              and applies the routing rules silently. No question asked.
 *
 * Either way every routing and hazard decision downstream reads from here.
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
  asksVehiclePerTrip,
  knownCompanies,
  tierForTrucks,
  type FleetTier,
} from "@/data/accounts";
import { assignmentFor, profileFromAssignment, type FleetAssignment } from "@/data/fleet-assignments";
import { useAuth } from "./auth";
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

/** Where the active profile came from for this trip. */
export type ProfileResolution = "asked" | "inherited";

type Ctx = {
  profiles: VehicleProfile[];
  active: VehicleProfile;
  rules: RoutingRules;
  /** "asked" for small operations, "inherited" for Tier 2 / Tier 3 fleets. */
  resolution: ProfileResolution;
  /** The fleet's truck/trailer assignment, when the profile is inherited. */
  assignment: FleetAssignment | null;
  /** The fleet size tier this driver's carrier onboarded as, if any. */
  fleetTier: FleetTier | null;
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
  const { account } = useAuth();
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

  /**
   * Fleet size decides everything about how the profile is resolved. Truck count
   * comes off the company record (seats); a solo driver always answers for
   * themselves.
   */
  const trucks = account?.kind === "zeusFleet" ? (account.seats ?? 1) : companyTrucks(account);
  const fleetTier: FleetTier | null =
    account && account.kind !== "solo" ? tierForTrucks(trucks) : null;
  const asks = asksVehiclePerTrip(account?.kind ?? "solo", trucks);

  /** Tier 2 / Tier 3: the company's assignment for this driver, silently applied. */
  const assignment = useMemo(
    () => (asks ? null : assignmentFor(account?.company?.code, account?.email)),
    [asks, account?.company?.code, account?.email],
  );
  const inherited = useMemo(
    () => (assignment ? profileFromAssignment(assignment) : null),
    [assignment],
  );

  const chosen = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0] ?? defaultProfile,
    [profiles, activeId],
  );
  const active = inherited ?? chosen;
  const resolution: ProfileResolution = inherited ? "inherited" : "asked";

  const value = useMemo<Ctx>(() => {
    return {
      profiles: inherited ? [inherited, ...profiles.filter((p) => p.id !== inherited.id)] : profiles,
      active,
      rules: rulesFor(active),
      resolution,
      assignment,
      fleetTier,
      ready,
      /* Larger fleets are never asked — the company record already answered. */
      askForTrip:
        ready && resolution === "asked" && profiles.length > 1 && answeredTrip !== todayStamp(),
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
  }, [
    profiles,
    active,
    activeId,
    answeredTrip,
    ready,
    persist,
    resolution,
    assignment,
    fleetTier,
    inherited,
  ]);

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicle(): Ctx {
  const ctx = useContext(VehicleContext);
  if (ctx)  return ctx;
  return {
    profiles: [defaultProfile],
    active: defaultProfile,
    rules: rulesFor(defaultProfile),
    resolution: "asked",
    assignment: null,
    fleetTier: null,
    askForTrip: false,
    chooseForTrip: () => {},
    dismissTripPrompt: () => {},
    addProfile: () => {},
    removeProfile: () => {},
    ready: false,
  };
}

/**
 * How many trucks the carrier a company driver is linked to runs. A driver on
 * an outside company inherits that company's tier behaviour.
 */
function companyTrucks(account: { kind?: string; company?: { code: string } } | null) {
  if (!account?.company?.code) return 1;
  const known = knownCompanies.find((c) => c.code === account.company!.code);
  return known?.trucks ?? 1;
}
