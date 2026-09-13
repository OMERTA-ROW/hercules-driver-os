/**
 * Live data. Every value here comes out of the driver's own rows in the
 * database — there is no seeded, sample, or placeholder data anywhere in this
 * file. When a table is empty the hooks return empty arrays and nulls so the
 * screens can say so honestly instead of inventing numbers.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type VehicleRow = {
  id: string;
  owner_id: string;
  company_code: string | null;
  label: string;
  unit_number: string | null;
  equipment_type: string;
  vocation: string | null;
  make: string | null;
  model: string | null;
  model_year: number | null;
  height_inches: number | null;
  length_inches: number | null;
  width_inches: number | null;
  gross_weight_lb: number | null;
  axles: number | null;
  hazmat: boolean;
  adapter_kind: string | null;
  active: boolean;
};

export type LoadRow = {
  id: string;
  posted_by: string | null;
  reference: string | null;
  status: string;
  broker_name: string | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_city: string | null;
  dest_state: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  rate_cents: number | null;
  miles: number | null;
  equipment_type: string | null;
  commodity: string | null;
  weight_lb: number | null;
  pickup_at: string | null;
  deliver_at: string | null;
  assigned_driver_id: string | null;
  vehicle_id: string | null;
  notes: string | null;
};

export type TripRow = {
  id: string;
  driver_id: string;
  load_id: string | null;
  vehicle_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  miles: number | null;
  drive_minutes: number | null;
  on_duty_minutes: number | null;
};

export type ReadingRow = {
  id: string;
  vehicle_id: string;
  recorded_at: string;
  adapter_kind: string;
  metric: string;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  fault_code: string | null;
  severity: string | null;
};

export type MoneyRow = {
  id: string;
  entry_date: string;
  category: string;
  description: string | null;
  amount_cents: number;
  load_id: string | null;
  gallons: number | null;
  odometer: number | null;
};

export type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string | null;
  vehicle_id: string | null;
  load_id: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

const VEHICLE_COLS =
  "id, owner_id, company_code, label, unit_number, equipment_type, vocation, make, model, model_year, height_inches, length_inches, width_inches, gross_weight_lb, axles, hazmat, adapter_kind, active";
const LOAD_COLS =
  "id, posted_by, reference, status, broker_name, origin_city, origin_state, origin_lat, origin_lng, dest_city, dest_state, dest_lat, dest_lng, rate_cents, miles, equipment_type, commodity, weight_lb, pickup_at, deliver_at, assigned_driver_id, vehicle_id, notes";

/** True once we know whether anyone is signed in. Queries stay parked until then. */
function useKey(part: string) {
  const { userId, ready } = useAuth();
  return { userId, enabled: ready && !!userId, key: [part, userId ?? "anon"] as const };
}

export function useVehicles() {
  const { enabled, key } = useKey("vehicles");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select(VEHICLE_COLS)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VehicleRow[];
    },
  });
}

export function useAvailableLoads() {
  const { enabled, key } = useKey("loads-available");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<LoadRow[]> => {
      const { data, error } = await supabase
        .from("loads")
        .select(LOAD_COLS)
        .eq("status", "available")
        .order("pickup_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LoadRow[];
    },
  });
}

/** Loads this driver is actually on — booked, rolling, or delivered. */
export function useMyLoads() {
  const { enabled, key, userId } = useKey("loads-mine");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<LoadRow[]> => {
      const { data, error } = await supabase
        .from("loads")
        .select(LOAD_COLS)
        .eq("assigned_driver_id", userId!)
        .order("pickup_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoadRow[];
    },
  });
}

export function useCurrentLoad() {
  const q = useMyLoads();
  const rolling =
    q.data?.find((l) => l.status === "in_transit") ??
    q.data?.find((l) => l.status === "booked") ??
    null;
  return { ...q, load: rolling };
}

export function useTrips() {
  const { enabled, key, userId } = useKey("trips");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, driver_id, load_id, vehicle_id, status, started_at, ended_at, start_odometer, end_odometer, miles, drive_minutes, on_duty_minutes",
        )
        .eq("driver_id", userId!)
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });
}

export function useReadings(vehicleId: string | null) {
  const { enabled, key } = useKey("readings");
  return useQuery({
    queryKey: [...key, vehicleId ?? "none"],
    enabled: enabled && !!vehicleId,
    queryFn: async (): Promise<ReadingRow[]> => {
      const { data, error } = await supabase
        .from("vehicle_health_readings")
        .select(
          "id, vehicle_id, recorded_at, adapter_kind, metric, value_num, value_text, unit, fault_code, severity",
        )
        .eq("vehicle_id", vehicleId!)
        .order("recorded_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as ReadingRow[];
    },
  });
}

export function useMoneyEntries() {
  const { enabled, key, userId } = useKey("money");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<MoneyRow[]> => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("id, entry_date, category, description, amount_cents, load_id, gallons, odometer")
        .eq("owner_id", userId!)
        .order("entry_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as MoneyRow[];
    },
  });
}

export function useAlertRows() {
  const { enabled, key, userId } = useKey("alerts");
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<AlertRow[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, kind, severity, title, body, vehicle_id, load_id, acknowledged_at, created_at")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Derived numbers — all computed from real rows, null when there are none */
/* ------------------------------------------------------------------ */

export const DRIVE_LIMIT_MIN = 11 * 60;
export const ON_DUTY_LIMIT_MIN = 14 * 60;
export const CYCLE_LIMIT_HRS = 70;

export type Hours = {
  driveRemainingMin: number;
  driveTotalMin: number;
  onDutyRemainingMin: number;
  onDutyTotalMin: number;
  cycleRemainingHrs: number;
  cycleTotalHrs: number;
};

/** Hours of service from logged trips. Null until the driver has logged time. */
export function useHours(): { hours: Hours | null; loading: boolean } {
  const { data, isLoading } = useTrips();
  if (!data || data.length === 0) return { hours: null, loading: isLoading };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const cycleStart = Date.now() - 8 * 86_400_000;

  const today = data.filter((t) => t.started_at && new Date(t.started_at) >= dayStart);
  const cycle = data.filter((t) => t.started_at && new Date(t.started_at).getTime() >= cycleStart);

  const drive = today.reduce((sum, t) => sum + (t.drive_minutes ?? 0), 0);
  const onDuty = today.reduce((sum, t) => sum + (t.on_duty_minutes ?? t.drive_minutes ?? 0), 0);
  const cycleMin = cycle.reduce((sum, t) => sum + (t.on_duty_minutes ?? t.drive_minutes ?? 0), 0);

  return {
    loading: false,
    hours: {
      driveRemainingMin: Math.max(0, DRIVE_LIMIT_MIN - drive),
      driveTotalMin: DRIVE_LIMIT_MIN,
      onDutyRemainingMin: Math.max(0, ON_DUTY_LIMIT_MIN - onDuty),
      onDutyTotalMin: ON_DUTY_LIMIT_MIN,
      cycleRemainingHrs: Math.max(0, CYCLE_LIMIT_HRS - cycleMin / 60),
      cycleTotalHrs: CYCLE_LIMIT_HRS,
    },
  };
}

/** Miles driven this week and this month, straight from trip rows. */
export function useMileage() {
  const { data, isLoading } = useTrips();
  const rows = data ?? [];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const milesOf = (t: TripRow) =>
    t.miles ??
    (t.end_odometer != null && t.start_odometer != null ? t.end_odometer - t.start_odometer : 0);

  const since = (from: Date) =>
    rows
      .filter((t) => t.started_at && new Date(t.started_at) >= from)
      .reduce((sum, t) => sum + milesOf(t), 0);

  return {
    loading: isLoading,
    hasData: rows.length > 0,
    week: since(weekStart),
    month: since(monthStart),
    total: rows.reduce((sum, t) => sum + milesOf(t), 0),
  };
}

/** Revenue, cost and net from real money entries over the last 7 and 30 days. */
export function useMoneySummary() {
  const { data, isLoading } = useMoneyEntries();
  const rows = data ?? [];
  const window = (days: number) => {
    const from = Date.now() - days * 86_400_000;
    const inWindow = rows.filter((r) => new Date(r.entry_date).getTime() >= from);
    const revenue = inWindow
      .filter((r) => r.amount_cents > 0)
      .reduce((s, r) => s + r.amount_cents, 0);
    const cost = inWindow.filter((r) => r.amount_cents < 0).reduce((s, r) => s - r.amount_cents, 0);
    return { revenue, cost, net: revenue - cost, count: inWindow.length };
  };
  return { loading: isLoading, hasData: rows.length > 0, week: window(7), month: window(30) };
}

export function useRefreshLive() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries();
  }, [qc]);
}

export function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function place(city: string | null, state: string | null) {
  if (!city && !state) return "—";
  return [city, state].filter(Boolean).join(", ");
}
