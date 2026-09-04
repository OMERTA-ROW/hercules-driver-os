/**
 * TRUCK HAZARD LAYER — adapter + driver-configurable toggles.
 *
 * `HazardProvider` below is the seam for a commercial truck-attribute data
 * provider (HERE Truck Attributes, Trimble/PC*MILER, state DOT bridge and
 * railroad-crossing datasets). Swap `mockHazardProvider` for a server-backed
 * implementation and nothing in the map or warning UI changes.
 *
 * Google Maps supplies none of these attributes, so this layer is always
 * separate from the base map.
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
import { hazardKinds, hazards as mockHazards, type Hazard, type HazardKind } from "@/data/hazards";
import { truckProfile } from "@/data/routing";

export type TruckProfile = typeof truckProfile;

export type HazardProvider = {
  name: string;
  /** Hazards along the active route, ordered by distance ahead. */
  hazardsAhead(input: { profile: TruckProfile }): Promise<Hazard[]>;
};

export const mockHazardProvider: HazardProvider = {
  name: "hercules-mock-hazards (pluggable: HERE / Trimble PC*MILER / DOT feeds)",
  async hazardsAhead() {
    return [...mockHazards].sort((a, b) => a.milesAhead - b.milesAhead);
  },
};

export const hazardLayer: HazardProvider = mockHazardProvider;

/** Does this hazard actually threaten THIS truck's height / weight / length? */
export function exceedsTruck(h: Hazard, profile: TruckProfile) {
  if (h.clearanceFt !== undefined && h.clearanceFt < profile.minClearanceFt) return true;
  if (h.maxLengthFt !== undefined && profile.lengthFt > h.maxLengthFt) return true;
  if (h.weightLimitLbs !== undefined && profile.grossWeightLbs > h.weightLimitLbs) return true;
  // Heavy truck on a steep descent is a real hazard even where nothing is posted.
  if (h.gradePct !== undefined && h.gradePct <= -5 && profile.grossWeightLbs > 60000) return true;
  return false;
}

/** Severity after factoring the driver's configuration in. */
export function effectiveSeverity(h: Hazard, profile: TruckProfile): Hazard["severity"] {
  if (exceedsTruck(h, profile)) return "critical";
  return h.severity;
}

// ---------------------------------------------------------------- toggles ---

const STORAGE_KEY = "hercules.hazardLayers";

type Toggles = Record<HazardKind, boolean>;

const allOn = (): Toggles =>
  hazardKinds.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Toggles);

type Ctx = {
  enabled: Toggles;
  isOn: (k: HazardKind) => boolean;
  toggle: (k: HazardKind) => void;
  setAll: (on: boolean) => void;
};

const HazardContext = createContext<Ctx>({
  enabled: allOn(),
  isOn: () => true,
  toggle: () => {},
  setAll: () => {},
});

export function HazardLayerProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Toggles>(allOn);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEnabled({ ...allOn(), ...(JSON.parse(raw) as Partial<Toggles>) });
    } catch {
      /* ignore malformed local state */
    }
  }, []);

  const persist = useCallback((next: Toggles) => {
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      enabled,
      isOn: (k) => enabled[k] !== false,
      toggle: (k) => persist({ ...enabled, [k]: !(enabled[k] !== false) }),
      setAll: (on) =>
        persist(hazardKinds.reduce((acc, k) => ({ ...acc, [k]: on }), {} as Toggles)),
    }),
    [enabled, persist],
  );

  return <HazardContext.Provider value={value}>{children}</HazardContext.Provider>;
}

export function useHazardLayers() {
  return useContext(HazardContext);
}
