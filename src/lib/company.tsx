/**
 * COMPANY MEMBERSHIP — real, database-backed.
 *
 * A driver belongs to a carrier only when there is an active row in
 * `company_members`. Nothing on this side of the wire can create, approve or
 * escalate a membership: every write goes through a checked database routine
 * (`company_create`, `company_join`, `company_invite_create`,
 * `company_member_decide`, `company_member_remove`) that re-reads the caller's
 * identity and role server-side. A code typed into a profile row is not proof
 * of anything and is never used for permission.
 */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type CompanyRole = "owner" | "dispatcher" | "driver" | "leased";
export type MemberStatus = "pending" | "active" | "removed";

export type Membership = {
  id: string;
  companyId: string;
  role: CompanyRole;
  status: MemberStatus;
  company: {
    id: string;
    name: string;
    code: string;
    dotNumber: string | null;
    mcNumber: string | null;
    loadBoardConnected: boolean;
    loadBoardProvider: string | null;
  };
};

type MemberRow = {
  id: string;
  company_id: string;
  role: string;
  status: string;
  companies: {
    id: string;
    name: string;
    code: string;
    dot_number: string | null;
    mc_number: string | null;
    load_board_connected: boolean;
    load_board_provider: string | null;
  } | null;
};

function toMembership(row: MemberRow): Membership | null {
  if (!row.companies) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    role: row.role as CompanyRole,
    status: row.status as MemberStatus,
    company: {
      id: row.companies.id,
      name: row.companies.name,
      code: row.companies.code,
      dotNumber: row.companies.dot_number,
      mcNumber: row.companies.mc_number,
      loadBoardConnected: row.companies.load_board_connected,
      loadBoardProvider: row.companies.load_board_provider,
    },
  };
}

export function useMemberships() {
  const { userId, ready } = useAuth();
  const q = useQuery({
    queryKey: ["memberships", userId],
    enabled: ready && !!userId,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select(
          "id, company_id, role, status, companies(id, name, code, dot_number, mc_number, load_board_connected, load_board_provider)",
        )
        .eq("user_id", userId!)
        .neq("status", "removed")
        .order("created_at");
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as MemberRow[])
        .map(toMembership)
        .filter((m): m is Membership => m !== null);
    },
  });
  const active = useMemo(
    () => (q.data ?? []).filter((m) => m.status === "active"),
    [q.data],
  );
  const pending = useMemo(
    () => (q.data ?? []).filter((m) => m.status === "pending"),
    [q.data],
  );
  return {
    memberships: q.data ?? [],
    active,
    pending,
    /** The fleet this account owns or dispatches for, if any. */
    managed: active.find((m) => m.role === "owner" || m.role === "dispatcher") ?? null,
    /** The carrier this account drives for, if any. */
    driving: active.find((m) => m.role === "driver" || m.role === "leased") ?? null,
    isLoading: q.isLoading,
    error: q.error ? "Your company link could not be read just now." : null,
    refetch: q.refetch,
  };
}

export type RosterMember = {
  id: string;
  userId: string;
  role: CompanyRole;
  status: MemberStatus;
  name: string | null;
  email: string | null;
  joinedAt: string | null;
};

export function useRoster(companyId: string | null) {
  return useQuery({
    queryKey: ["company-roster", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<RosterMember[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, user_id, role, status, joined_at")
        .eq("company_id", companyId!)
        .neq("status", "removed")
        .order("created_at");
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const ids = rows.map((r) => r.user_id);
      // Profile rows are readable only for your own account, so a name may be
      // absent here. That is shown as "Driver on file", never invented.
      const names = new Map<string, { name: string | null; email: string | null }>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        for (const p of profs ?? []) names.set(p.id, { name: p.full_name, email: p.email });
      }
      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        role: r.role as CompanyRole,
        status: r.status as MemberStatus,
        name: names.get(r.user_id)?.name ?? null,
        email: names.get(r.user_id)?.email ?? null,
        joinedAt: r.joined_at,
      }));
    },
  });
}

export type Invite = {
  id: string;
  code: string;
  role: CompanyRole;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  revoked: boolean;
  requiresApproval: boolean;
};

export function useInvites(companyId: string | null) {
  return useQuery({
    queryKey: ["company-invites", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("company_invites")
        .select("id, code, role, expires_at, max_uses, used_count, revoked, requires_approval")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        code: r.code,
        role: r.role as CompanyRole,
        expiresAt: r.expires_at,
        maxUses: r.max_uses,
        usedCount: r.used_count,
        revoked: r.revoked,
        requiresApproval: r.requires_approval,
      }));
    },
  });
}

/** Plain-language wording for every refusal the database can return. */
export function joinErrorMessage(code: string): string {
  switch (code) {
    case "unknown_code":
      return "That code isn't recognized. Ask your carrier for a current one.";
    case "expired":
      return "That invite has expired. Ask your carrier for a new code.";
    case "revoked":
      return "That invite was cancelled by the carrier.";
    case "used_up":
      return "That invite has already been used.";
    case "wrong_email":
      return "That invite was issued to a different email address.";
    case "not_signed_in":
      return "Sign in first, then enter your code.";
    case "bad_name":
      return "Use your carrier's real name, 2 to 80 characters.";
    case "too_many_companies":
      return "You already own the maximum number of fleets on this account.";
    case "not_permitted":
      return "Only an owner or dispatcher at that company can do this.";
    case "owner_only":
      return "Only the company owner can invite a dispatcher.";
    case "last_owner":
      return "A company must keep at least one owner.";
    case "cannot_change_owner":
      return "The owner's membership can't be changed here.";
    default:
      return "That didn't go through. Nothing was changed.";
  }
}

type Rpc = Record<string, unknown> & { ok?: boolean; error?: string };

export function useCompanyActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["memberships"] });
    void qc.invalidateQueries({ queryKey: ["company-roster"] });
    void qc.invalidateQueries({ queryKey: ["company-invites"] });
  };

  const call = async (fn: string, args: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)(fn, args);
    if (error) return { ok: false, message: "The database refused that. Nothing was changed." };
    const res = (data ?? {}) as Rpc;
    if (!res.ok) return { ok: false, message: joinErrorMessage(String(res.error ?? "")), raw: res };
    invalidate();
    return { ok: true, message: "Done.", raw: res };
  };

  return {
    createCompany: useMutation({
      mutationFn: (v: { name: string; dot?: string; mc?: string; homeBase?: string }) =>
        call("company_create", {
          _name: v.name,
          _dot: v.dot ?? null,
          _mc: v.mc ?? null,
          _home_base: v.homeBase ?? null,
        }),
    }),
    join: useMutation({
      mutationFn: (code: string) => call("company_join", { _code: code.trim().toUpperCase() }),
    }),
    createInvite: useMutation({
      mutationFn: (v: {
        companyId: string;
        role: Exclude<CompanyRole, "owner">;
        expiresHours: number;
        maxUses: number;
        email?: string;
      }) =>
        call("company_invite_create", {
          _company: v.companyId,
          _role: v.role,
          _expires_hours: v.expiresHours,
          _max_uses: v.maxUses,
          _email: v.email?.trim() || null,
          _requires_approval: true,
        }),
    }),
    revokeInvite: useMutation({
      mutationFn: (id: string) => call("company_invite_revoke", { _invite: id }),
    }),
    decideMember: useMutation({
      mutationFn: (v: { memberId: string; approve: boolean }) =>
        call("company_member_decide", { _member: v.memberId, _approve: v.approve }),
    }),
    removeMember: useMutation({
      mutationFn: (memberId: string) => call("company_member_remove", { _member: memberId }),
    }),
  };
}
