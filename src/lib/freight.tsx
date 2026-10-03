/**
 * HERCULES FREIGHT OS — company/role context and data helpers.
 *
 * Roles come only from `freight_member_roles`, granted by the database
 * (company creation, invite acceptance). The "active role" below is a viewing
 * lens limited to roles the caller actually holds; every read is filtered by
 * row-level security and every write goes through a checked database routine,
 * so switching lens can never widen access.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FreightRole = "admin" | "dispatcher" | "driver" | "fleet_owner" | "broker" | "shipper" | "finance";
export type FreightCompany = { id: string; name: string; business_type: string; status: string; roles: FreightRole[] };

export const ROLE_LABEL: Record<FreightRole, string> = {
  admin: "Admin",
  dispatcher: "Dispatcher",
  driver: "Driver",
  fleet_owner: "Fleet owner",
  broker: "Broker",
  shipper: "Shipper",
  finance: "Finance",
};

type Ctx = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  companies: FreightCompany[];
  company: FreightCompany | null;
  role: FreightRole | null;
  roles: FreightRole[];
  has: (...r: FreightRole[]) => boolean;
  setCompany: (id: string) => void;
  setRole: (r: FreightRole) => void;
  refresh: () => Promise<unknown>;
};

const FreightCtx = createContext<Ctx | null>(null);
const CO_KEY = "hfo.company";
const ROLE_KEY = "hfo.role";

export function FreightProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [coId, setCoId] = useState<string | null>(null);
  const [roleSel, setRoleSel] = useState<FreightRole | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser()
      .then(({ data }) => {
        if (!alive) return;
        setUserId(data.user?.id ?? null);
        setEmail(data.user?.email ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setUserId(null);
        setEmail(null);
      });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
    });
    setCoId(localStorage.getItem(CO_KEY));
    setRoleSel(localStorage.getItem(ROLE_KEY) as FreightRole | null);
    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const ctxQ = useQuery({
    queryKey: ["hfo-context", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("freight_my_context");
      if (error) throw new Error(error.message);
      const res = data as { companies?: FreightCompany[] };
      return (res.companies ?? []).filter((c) => c.status === "active");
    },
  });

  const companies = ctxQ.data ?? [];
  const company = companies.find((c) => c.id === coId) ?? companies[0] ?? null;
  const roles = company?.roles ?? [];
  const role = roleSel && roles.includes(roleSel) ? roleSel : (roles[0] ?? null);

  const clearScoped = useCallback(() => {
    // Company/role scoped data must never leak between workspaces.
    qc.removeQueries({ predicate: (q) => q.queryKey[0] === "f" });
  }, [qc]);

  const setCompany = useCallback(
    (id: string) => {
      if (!companies.some((c) => c.id === id)) return;
      localStorage.setItem(CO_KEY, id);
      localStorage.removeItem(ROLE_KEY);
      setRoleSel(null);
      setCoId(id);
      clearScoped();
    },
    [companies, clearScoped],
  );
  const setRole = useCallback(
    (r: FreightRole) => {
      if (!roles.includes(r)) return;
      localStorage.setItem(ROLE_KEY, r);
      setRoleSel(r);
      clearScoped();
    },
    [roles, clearScoped],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready: !userId || (!ctxQ.isLoading && !ctxQ.isFetching),
      userId,
      email,
      companies,
      company,
      role,
      roles,
      has: (...r) => r.some((x) => roles.includes(x)),
      setCompany,
      setRole,
      refresh: ctxQ.refetch,
    }),
    [userId, email, ctxQ.isLoading, ctxQ.refetch, companies, company, role, roles, setCompany, setRole],
  );
  return <FreightCtx.Provider value={value}>{children}</FreightCtx.Provider>;
}

export function useFreight() {
  const c = useContext(FreightCtx);
  if (!c) throw new Error("useFreight must be used inside FreightProvider");
  return c;
}

/** Plain-language wording for every refusal a freight routine can return. */
export function freightError(code: string | undefined, missing?: string[]): string {
  const m: Record<string, string> = {
    not_signed_in: "Sign in first.",
    not_permitted: "Your role in this company doesn't allow that.",
    bad_name: "Use a company name between 2 and 80 characters.",
    bad_type: "That file type isn't accepted. Use PDF, JPG, PNG, WEBP or HEIC.",
    too_large: "That file is over 15 MB.",
    bad_email: "Enter a valid email address.",
    bad_role: "Pick a role.",
    bad_expiry: "Expiry must be between 1 hour and 14 days.",
    unknown_code: "That invitation isn't recognized.",
    expired: "That invitation has expired. Ask for a new one.",
    revoked: "That invitation was cancelled.",
    used_up: "That invitation has already been used.",
    wrong_email: "This invitation was sent to a different email address. Sign in with that address.",
    stale_version: "Someone else changed this load. Reload and try again.",
    load_closed: "This load is closed.",
    approval_required: "This change needs an admin's approval. Request it from the approvals panel.",
    missing_fields: `Fill in the required fields first${missing?.length ? ": " + missing.join(", ") : ""}.`,
    driver_not_in_company: "That person isn't an active driver in this company.",
    driver_unavailable: "That driver is marked unavailable.",
    driver_cdl_expired: "That driver's CDL expires before delivery.",
    driver_medical_expired: "That driver's medical card expires before delivery.",
    bad_truck: "Pick a truck from this company.",
    bad_trailer: "Pick a trailer from this company.",
    truck_unavailable: "That truck is in maintenance or out of service.",
    trailer_unavailable: "That trailer is in maintenance or out of service.",
    truck_docs_expired: "That truck's insurance or registration expires before delivery.",
    schedule_conflict: "The driver or equipment already has a load in that window.",
    already_answered: "You already answered this assignment.",
    reason_required: "Add a short reason.",
    accept_first: "Accept the load before updating its status.",
    out_of_order: "Statuses go one step at a time.",
    not_active: "This load isn't active.",
    pod_required: "Delivery needs a stored proof of delivery. Only an admin can override it, with a reason of at least 10 characters.",
    dispatcher_clears_exception: "A dispatcher has to clear the exception.",
    file_missing: "The upload didn't finish. Try again.",
    already_final: "That document is already saved.",
    not_delivered: "Invoices can only be drafted after delivery.",
    no_rate: "Set the customer rate first.",
    already_invoiced: "This load already has an invoice.",
    self_approval: "You can't approve your own request. Another admin has to approve it.",
    already_decided: "This request was already decided.",
    stale: "The load changed after this request was made. Make a new request.",
    duplicate_request: "An identical request is already waiting.",
    carrier_not_verified: "Verify the carrier before booking.",
    last_admin: "A company must keep at least one admin.",
    delivery_before_pickup: "Delivery must be after pickup.",
    bad_input: "Some values aren't valid. Check dates and numbers.",
    duplicate_reference: "That reference number is already used.",
    bad_customer: "Pick a customer from this company.",
    too_many_companies: "You already administer the maximum number of companies.",
  };
  return (code && m[code]) || "That didn't go through. Nothing was changed.";
}

export type RpcResult = { ok: boolean; error?: string; missing?: string[]; [k: string]: unknown };

export async function rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult & { message: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) return { ok: false, error: "network", message: "The server couldn't be reached. Nothing was changed." };
  const r = (data ?? {}) as RpcResult;
  return { ...r, message: r.ok ? "Saved." : freightError(r.error, r.missing) };
}

export const OP_STEPS = [
  "assigned",
  "en_route_pickup",
  "arrived_pickup",
  "loaded",
  "en_route_delivery",
  "arrived_delivery",
  "delivered",
] as const;
export const OP_LABEL: Record<string, string> = {
  assigned: "Assigned",
  en_route_pickup: "En route to pickup",
  arrived_pickup: "Arrived at pickup",
  loaded: "Loaded",
  en_route_delivery: "En route to delivery",
  arrived_delivery: "Arrived at delivery",
  delivered: "Delivered",
  exception: "Exception",
};
export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  tendered: "Tendered",
  countered: "Countered",
  accepted: "Accepted",
  assigned: "Assigned",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type BoardColumn = "Unassigned" | "Assigned" | "Pickup" | "Transit" | "Delivery" | "Exception" | "Completed";
export function boardColumn(l: { status: string; op_status: string | null }): BoardColumn | null {
  if (l.status === "cancelled") return null;
  if (l.status === "delivered" || l.op_status === "delivered") return "Completed";
  if (l.op_status === "exception") return "Exception";
  if (!l.op_status) return "Unassigned";
  if (l.op_status === "assigned") return "Assigned";
  if (l.op_status === "en_route_pickup" || l.op_status === "arrived_pickup") return "Pickup";
  if (l.op_status === "loaded" || l.op_status === "en_route_delivery") return "Transit";
  return "Delivery";
}

export const money = (c: number | null | undefined) =>
  c == null ? "—" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
export const when = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export type LoadRow = {
  id: string;
  company_id: string;
  reference: string;
  status: string;
  op_status: string | null;
  driver_response: string | null;
  driver_response_reason: string | null;
  origin: string | null;
  destination: string | null;
  pickup_at: string | null;
  delivery_at: string | null;
  equipment_type: string | null;
  commodity: string | null;
  weight_lb: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  customer_id: string | null;
  shipper_company_id: string | null;
  driver_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  pod_document_id: string | null;
  delivered_override_reason: string | null;
  version: number;
  updated_at: string;
};

export function useLoads(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["f", "loads", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<LoadRow[]> => {
      const { data, error } = await supabase
        .from("freight_loads")
        .select("*")
        .eq("company_id", companyId!)
        .order("pickup_at", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return data as LoadRow[];
    },
  });
}

export type TeamMember = {
  user_id: string;
  name: string | null;
  email: string | null;
  roles: FreightRole[];
  available: boolean | null;
  cdl_expires: string | null;
  medical_expires: string | null;
  is_driver: boolean;
};
export function useTeam(companyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["f", "team", companyId],
    enabled: !!companyId && enabled,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase.rpc("freight_team", { _company: companyId! });
      if (error) throw new Error(error.message);
      const r = data as { ok: boolean; members?: TeamMember[] };
      if (!r.ok) throw new Error("not_permitted");
      return r.members ?? [];
    },
  });
}

/** Signed, short-lived download link for a stored document. */
export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from("freight-docs").createSignedUrl(path, 120);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Register → upload → finalize; a failed upload removes the pending record. */
export async function uploadDocument(opts: {
  companyId: string;
  loadId?: string | null;
  equipmentId?: string | null;
  driverUserId?: string | null;
  kind: string;
  file: File;
}): Promise<{ ok: boolean; message: string }> {
  const reg = await rpc("freight_doc_register", {
    _company: opts.companyId,
    _load: opts.loadId ?? null,
    _equipment: opts.equipmentId ?? null,
    _driver: opts.driverUserId ?? null,
    _kind: opts.kind,
    _file_name: opts.file.name,
    _mime: opts.file.type,
    _size: opts.file.size,
  });
  if (!reg.ok) return reg;
  const path = String(reg["path"]);
  const id = String(reg["id"]);
  const up = await supabase.storage.from("freight-docs").upload(path, opts.file, { contentType: opts.file.type, upsert: false });
  if (up.error) {
    await rpc("freight_doc_abort", { _doc: id });
    return { ok: false, message: "The upload failed and was cleaned up. Try again." };
  }
  const fin = await rpc("freight_doc_finalize", { _doc: id });
  return fin.ok ? { ok: true, message: "Document saved." } : fin;
}
