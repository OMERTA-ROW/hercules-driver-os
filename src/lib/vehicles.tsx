/**
 * ACTIVE EQUIPMENT FOR THIS TRIP.
 *
 * Saved equipment lives on the driver's own account IN THE DATABASE, one row
 * per unit, readable only by that account (or its carrier). Nothing is kept in
 * the browser except which unit the driver said they were in today, so a new
 * account starts genuinely empty and two accounts never see each other's rigs.
 *
 * How the ACTIVE profile gets resolved depends on the size of the operation:
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
  tierForTrucks,
  type FleetTier,
} from "@/data/accounts";
import { assignmentFor, profileFromAssignment, type FleetAssignment } from "@/data/fleet-assignments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import {
  defaultProfile,
  rulesFor,
  specFor,
  specKey,
  type EighteenSub,
  type RoutingRules,
  type VehicleKind,
  type VehicleProfile,
} from "@/data/vehicles";

/** Which unit the driver answered with, per account. Local by design. */
const activeKey = (uid: string) => `hercules.vehicle.active.${uid}`;
const tripKey = (uid: string) => `hercules.vehicle.trip.${uid}`;

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Where the active profile came from for this trip. */
export type ProfileResolution = "asked" | "inherited";

export type SaveResult = { ok: boolean; message: string };

type Ctx = {
  profiles: VehicleProfile[];
  /** The unit routing is currently being calculated for. */
  active: VehicleProfile;
  rules: RoutingRules;
  /** True when nothing is saved yet, so `active` is only a generic template. */
  noneSaved: boolean;
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
  addProfile: (kind: VehicleKind, sub: EighteenSub | undefined, unit: string) => Promise<SaveResult>;
  removeProfile: (id: string) => Promise<SaveResult>;
  /** Set when the saved equipment could not be read — never shown as "none". */
  loadError: string | null;
  saving: boolean;
  ready: boolean;
};

const VehicleContext = createContext<Ctx | null>(null);

type VehicleRow = {
  id: string;
  label: string | null;
  unit_number: string | null;
  equipment_type: string | null;
};

/** A saved row back into the routing profile the rest of the app reads. */
function rowToProfile(row: VehicleRow): VehicleProfile {
  const [kind, sub] = (row.equipment_type ?? "eighteen:dryVan").split(":");
  const spec = specFor((kind || "eighteen") as VehicleKind, sub as EighteenSub | undefined);
  return {
    ...spec,
    id: row.id,
    unit: row.unit_number?.trim() || row.label?.trim() || spec.label,
    hazmat: "None",
  };
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const { account, userId } = useAuth();
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answeredTrip, setAnsweredTrip] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, label, unit_number, equipment_type")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true });
    if (error) {
      // Honest failure: an unreadable list is NOT an empty list.
      setLoadError("Your equipment could not be read just now. Check your connection and retry.");
      setProfiles([]);
      return;
    }
    setLoadError(null);
    setProfiles((data ?? []).map((r) => rowToProfile(r as VehicleRow)));
  }, []);

  useEffect(() => {
    let alive = true;
    setReady(false);
    void (async () => {
      if (!userId) {
        setProfiles([]);
        setActiveId(null);
        setAnsweredTrip(null);
        setLoadError(null);
        setReady(true);
        return;
      }
      try {
        setActiveId(localStorage.getItem(activeKey(userId)));
        setAnsweredTrip(localStorage.getItem(tripKey(userId)));
      } catch {
        /* ignore unreadable local state */
      }
      await load(userId);
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [userId, load]);

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
    () => profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null,
    [profiles, activeId],
  );
  // With nothing saved the app still needs dimensions to reason with, so it
  // falls back to a plainly-labelled generic tractor-trailer template.
  const active = inherited ?? chosen ?? defaultProfile;
  const resolution: ProfileResolution = inherited ? "inherited" : "asked";

  const addProfile = useCallback(
    async (kind: VehicleKind, sub: EighteenSub | undefined, unit: string): Promise<SaveResult> => {
      if (!userId) return { ok: false, message: "Sign in first — equipment saves to your account." };
      const name = unit.trim();
      if (name.length < 2) {
        return { ok: false, message: "Give it a name you'll recognise, at least 2 characters." };
      }
      if (name.length > 40) return { ok: false, message: "Keep the name under 40 characters." };
      const spec = specFor(kind, sub);
      setSaving(true);
      const { error } = await supabase.from("vehicles").insert({
        owner_id: userId,
        label: spec.label,
        unit_number: name,
        equipment_type: specKey(kind, sub),
        height_inches: Math.round(spec.heightFt * 12),
        length_inches: Math.round(spec.lengthFt * 12),
        gross_weight_lb: spec.grossWeightLbs,
        axles: spec.axles,
        ...(account?.company?.code ? { company_code: account.company.code } : {}),
      });
      setSaving(false);
      if (error) {
        console.error(`[vehicles] save failed: ${error.message}`);
        return { ok: false, message: "That did not save. Nothing was changed — try again." };
      }
      await load(userId);
      // A second unit on the account means the trip question starts firing.
      try {
        localStorage.removeItem(tripKey(userId));
      } catch {
        /* ignore */
      }
      setAnsweredTrip(null);
      return { ok: true, message: `${spec.label} saved to your account.` };
    },
    [account?.company?.code, load, userId],
  );

  const removeProfile = useCallback(
    async (id: string): Promise<SaveResult> => {
      if (!userId) return { ok: false, message: "Sign in first." };
      setSaving(true);
      const { error } = await supabase.from("vehicles").delete().eq("id", id).eq("owner_id", userId);
      setSaving(false);
      if (error) {
        console.error(`[vehicles] remove failed: ${error.message}`);
        return { ok: false, message: "That could not be removed. Nothing was changed." };
      }
      await load(userId);
      if (id === activeId) setActiveId(null);
      return { ok: true, message: "Removed from your account." };
    },
    [activeId, load, userId],
  );

  const value = useMemo<Ctx>(() => {
    return {
      profiles: inherited ? [inherited, ...profiles.filter((p) => p.id !== inherited.id)] : profiles,
      active,
      rules: rulesFor(active),
      noneSaved: !inherited && profiles.length === 0,
      resolution,
      assignment,
      fleetTier,
      ready,
      loadError,
      saving,
      /* Larger fleets are never asked — the company record already answered. */
      askForTrip:
        ready && resolution === "asked" && profiles.length > 1 && answeredTrip !== todayStamp(),
      chooseForTrip: (id) => {
        setActiveId(id);
        setAnsweredTrip(todayStamp());
        if (!userId) return;
        try {
          localStorage.setItem(activeKey(userId), id);
          localStorage.setItem(tripKey(userId), todayStamp());
        } catch {
          /* ignore */
        }
      },
      dismissTripPrompt: () => {
        setAnsweredTrip(todayStamp());
        if (!userId) return;
        try {
          localStorage.setItem(tripKey(userId), todayStamp());
        } catch {
          /* ignore */
        }
      },
      addProfile,
      removeProfile,
    };
  }, [
    profiles,
    active,
    answeredTrip,
    ready,
    resolution,
    assignment,
    fleetTier,
    inherited,
    loadError,
    saving,
    addProfile,
    removeProfile,
    userId,
  ]);

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}

export function useVehicle(): Ctx {
  const ctx = useContext(VehicleContext);
  if (ctx) return ctx;
  return {
    profiles: [],
    active: defaultProfile,
    rules: rulesFor(defaultProfile),
    noneSaved: true,
    resolution: "asked",
    assignment: null,
    fleetTier: null,
    askForTrip: false,
    chooseForTrip: () => {},
    dismissTripPrompt: () => {},
    addProfile: async () => ({ ok: false, message: "Equipment is not ready yet." }),
    removeProfile: async () => ({ ok: false, message: "Equipment is not ready yet." }),
    loadError: null,
    saving: false,
    ready: false,
  };
}

/**
 * How many trucks the carrier a company driver is linked to runs. A driver on
 * an outside company inherits that company's tier behaviour.
 */
function companyTrucks(account: { kind?: string; seats?: number } | null) {
  // Taken from the account's own record. There is no carrier directory to look
  // a truck count up in, so a linked driver counts as one until the carrier's
  // own record says otherwise.
  return Math.max(1, account?.seats ?? 1);
}
