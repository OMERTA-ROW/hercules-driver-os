import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type HerculesRole =
  | "driver"
  | "dispatcher"
  | "broker"
  | "shipper"
  | "fleet_manager"
  | "finance"
  | "company_admin"
  | "platform_admin";

export const roleLabels: Record<HerculesRole, string> = {
  driver: "Driver",
  dispatcher: "Dispatcher",
  broker: "Broker",
  shipper: "Shipper",
  fleet_manager: "Fleet Manager",
  finance: "Finance",
  company_admin: "Company Admin",
  platform_admin: "Platform Admin",
};

const ops: HerculesRole[] = ["dispatcher", "fleet_manager", "company_admin"];
const personal: HerculesRole[] = ["driver", ...ops];

/** Default deny: a page not listed here is open only to signed-out preview visitors. */
export const routeRoles: Record<string, HerculesRole[]> = {
  "/": [...personal, "broker", "shipper", "finance"],
  "/dashboard": [...personal, "broker", "finance"],
  "/navigation": personal,
  "/stops": personal,
  "/breakdown": personal,
  "/health": personal,
  "/alerts": [...personal, "broker"],
  "/driver": ["driver", "fleet_manager", "company_admin"],
  "/documents": [...personal, "broker", "shipper", "finance"],
  "/voice": [...personal, "broker"],
  "/settings": ["driver", "dispatcher", "broker", "shipper", "fleet_manager", "finance", "company_admin", "platform_admin"],
  "/financials": ["driver", "finance", "company_admin"],
  "/loads": ["dispatcher", "broker", "fleet_manager", "company_admin"],
  "/dispatch": ["dispatcher", "company_admin"],
  "/broker": ["broker", "company_admin"],
  "/fleet": ["fleet_manager", "company_admin"],
  "/equipment": ["dispatcher", "fleet_manager", "company_admin"],
  "/company": ["company_admin"],
  "/compliance": ["fleet_manager", "company_admin"],
  "/supply": ["fleet_manager", "company_admin"],
  "/parts": personal,
  "/store": personal,
  "/credits": [...personal, "broker"],
  "/pricing": ["driver", "dispatcher", "broker", "shipper", "fleet_manager", "finance", "company_admin", "platform_admin"],
  "/welcome": ["driver", "dispatcher", "broker", "shipper", "fleet_manager", "finance", "company_admin", "platform_admin"],
  "/verification": ["driver", "dispatcher", "broker", "shipper", "fleet_manager", "finance", "company_admin", "platform_admin"],
};

export function allowedFor(path: string, role: HerculesRole | null): boolean {
  if (!role) return false;
  const base = "/" + (path.split("/")[1] ?? "");
  const roles = routeRoles[base];
  return !!roles && roles.includes(role);
}

type AccessData = { roles: HerculesRole[]; active: HerculesRole | null };

async function fetchAccess(userId: string): Promise<AccessData> {
  const [r, a] = await Promise.all([
    supabase.from("hercules_user_roles").select("role").eq("user_id", userId),
    supabase.from("hercules_active_role").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  if (r.error) throw r.error;
  if (a.error) throw a.error;
  const held = (r.data ?? []).map((x) => x.role as HerculesRole);
  const act = a.data?.role as HerculesRole | undefined;
  return { roles: held, active: act && held.includes(act) ? act : (held[0] ?? null) };
}

/** Role lookup cached per account so page changes don't re-gate; failures surface as `error`, never as "no role". */
export function useAccess() {
  const { account } = useAuth();
  const userId = account?.id ?? null;
  const qc = useQueryClient();
  const key = ["hercules-access", userId] as const;
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchAccess(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["hercules-access", userId] });
  }, [qc, userId]);

  const switchRole = useCallback(
    async (role: HerculesRole) => {
      const { data, error } = await supabase.rpc("hercules_switch_role", { _role: role });
      if (!error && (data as { ok?: boolean } | null)?.ok) await reload();
      return !error;
    },
    [reload],
  );

  void key;
  return {
    signedIn: !!userId,
    roles: q.data?.roles ?? [],
    active: q.data?.active ?? null,
    loading: !!userId && q.isPending,
    error: !!userId && q.isError && !q.data,
    switchRole,
    reload,
  };
}
