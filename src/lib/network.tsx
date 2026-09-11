/**
 * NETWORK LAYER STATE (dispatcher + broker)
 * =========================================
 * Deliberately self-contained: it imports the shared data model and nothing from
 * the driver-side providers. Mount it around the dispatcher and broker views
 * only. When these layers move into their own app, this file and the two route
 * files move with them and HERCULES driver code is untouched.
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
  brokerFacilities as seedFacilities,
  loadStages,
  matchedLoads,
  networkExceptions,
  networkTrucks,
  seedPostings,
  type BrokerFacility,
  type LoadStage,
  type NetworkException,
  type PostedLoad,
} from "@/data/network";
import { roleAtLeast, roleHasScope, roleSpec, type NetworkRole, type NetworkScope } from "@/data/roles";

const ROLE_KEY = "hercules.network.role";
const POSTINGS_KEY = "hercules.network.postings";
const FACILITIES_KEY = "hercules.network.facilities";
const OVERRIDES_KEY = "hercules.network.overrides";

export type OverrideRecord = {
  id: string;
  exceptionId: string;
  unit: string;
  action: string;
  by: NetworkRole;
  at: string;
};

export type NewPosting = {
  origin: string;
  destination: string;
  miles: number;
  rate: number;
  equipment: string;
  pickupWindow: string;
  deliveryWindow: string;
  notes?: string;
  broker?: string;
};

type Ctx = {
  ready: boolean;
  role: NetworkRole;
  setRole: (role: NetworkRole) => void;
  can: (scope: NetworkScope) => boolean;
  atLeast: (min: NetworkRole) => boolean;
  /* dispatcher */
  trucks: typeof networkTrucks;
  matched: typeof matchedLoads;
  exceptions: NetworkException[];
  overrides: OverrideRecord[];
  intervene: (exception: NetworkException, action: string) => void;
  clearException: (id: string) => void;
  /* broker */
  postings: PostedLoad[];
  postLoad: (input: NewPosting) => PostedLoad;
  advanceStage: (id: string) => void;
  cancelPosting: (id: string) => void;
  facilities: BrokerFacility[];
  addFacility: (f: Omit<BrokerFacility, "id">) => void;
};

const fallback: Ctx = {
  ready: false,
  role: "driver",
  setRole: () => {},
  can: () => false,
  atLeast: () => false,
  trucks: networkTrucks,
  matched: matchedLoads,
  exceptions: [],
  overrides: [],
  intervene: () => {},
  clearException: () => {},
  postings: [],
  postLoad: () => seedPostings[0]!,
  advanceStage: () => {},
  cancelPosting: () => {},
  facilities: [],
  addFacility: () => {},
};

const NetworkContext = createContext<Ctx>(fallback);

function read<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [role, setRoleState] = useState<NetworkRole>("driver");
  const [postings, setPostings] = useState<PostedLoad[]>(seedPostings);
  const [facilities, setFacilities] = useState<BrokerFacility[]>(seedFacilities);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [cleared, setCleared] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(ROLE_KEY) as NetworkRole | null;
    if (stored === "dispatcher" || stored === "broker" || stored === "driver") setRoleState(stored);
    setPostings(read(POSTINGS_KEY, seedPostings));
    setFacilities(read(FACILITIES_KEY, seedFacilities));
    setOverrides(read<OverrideRecord[]>(OVERRIDES_KEY, []));
    setReady(true);
  }, []);

  const persistPostings = useCallback((next: PostedLoad[]) => {
    setPostings(next);
    localStorage.setItem(POSTINGS_KEY, JSON.stringify(next));
  }, []);

  const setRole = useCallback((next: NetworkRole) => {
    setRoleState(next);
    localStorage.setItem(ROLE_KEY, next);
  }, []);

  const can = useCallback((scope: NetworkScope) => roleHasScope(role, scope), [role]);
  const atLeast = useCallback((min: NetworkRole) => roleAtLeast(role, min), [role]);

  const intervene = useCallback(
    (exception: NetworkException, action: string) => {
      const record: OverrideRecord = {
        id: `ov-${Date.now()}`,
        exceptionId: exception.id,
        unit: exception.unit,
        action,
        by: role,
        at: new Date().toISOString(),
      };
      setOverrides((prev) => {
        const next = [record, ...prev].slice(0, 30);
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
        return next;
      });
    },
    [role],
  );

  const clearException = useCallback((id: string) => {
    setCleared((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const postLoad = useCallback(
    (input: NewPosting) => {
      const posting: PostedLoad = {
        id: `P-${Math.floor(4500 + Math.random() * 900)}`,
        broker: input.broker || "Meridian Freight Brokers",
        origin: input.origin,
        destination: input.destination,
        miles: input.miles,
        rate: input.rate,
        equipment: input.equipment,
        pickupWindow: input.pickupWindow,
        deliveryWindow: input.deliveryWindow,
        stage: "posted",
        ...(input.notes ? { notes: input.notes } : {}),
        postedAt: new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit" }),
      };
      persistPostings([posting, ...postings]);
      return posting;
    },
    [postings, persistPostings],
  );

  const advanceStage = useCallback(
    (id: string) => {
      persistPostings(
        postings.map((p) => {
          if (p.id !== id) return p;
          const idx = loadStages.indexOf(p.stage);
          const next = (loadStages[Math.min(idx + 1, loadStages.length - 1)] ?? p.stage) as LoadStage;
          const taken =
            next === "accepted" && !p.takenBy
              ? { takenBy: { name: "Sooner Freight Systems", unit: "T-233", kind: "fleet" as const } }
              : {};
          return { ...p, stage: next, ...taken };
        }),
      );
    },
    [postings, persistPostings],
  );

  const cancelPosting = useCallback(
    (id: string) => persistPostings(postings.filter((p) => p.id !== id)),
    [postings, persistPostings],
  );

  const addFacility = useCallback((f: Omit<BrokerFacility, "id">) => {
    setFacilities((prev) => {
      const next = [{ ...f, id: `f-${Date.now()}` }, ...prev];
      localStorage.setItem(FACILITIES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const exceptions = useMemo(
    () => networkExceptions.filter((x) => !cleared.includes(x.id)),
    [cleared],
  );

  return (
    <NetworkContext.Provider
      value={{
        ready,
        role,
        setRole,
        can,
        atLeast,
        trucks: networkTrucks,
        matched: matchedLoads,
        exceptions,
        overrides,
        intervene,
        clearException,
        postings,
        postLoad,
        advanceStage,
        cancelPosting,
        facilities,
        addFacility,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

export { roleSpec };
