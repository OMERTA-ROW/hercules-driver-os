import { useCallback, useEffect, useState } from "react";
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

export function useAccess() {
  const { account } = useAuth();
  const userId = account?.id ?? null;
  const [roles, setRoles] = useState<HerculesRole[]>([]);
  const [active, setActive] = useState<HerculesRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setRoles([]);
      setActive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase.from("hercules_user_roles").select("role").eq("user_id", userId),
      supabase.from("hercules_active_role").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    const held = (r.data ?? []).map((x) => x.role as HerculesRole);
    setRoles(held);
    const act = a.data?.role as HerculesRole | undefined;
    setActive(act && held.includes(act) ? act : (held[0] ?? null));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchRole = useCallback(
    async (role: HerculesRole) => {
      const { data, error } = await supabase.rpc("hercules_switch_role", { _role: role });
      if (!error && (data as { ok?: boolean } | null)?.ok) await load();
      return !error;
    },
    [load],
  );

  return { signedIn: !!userId, roles, active, loading, switchRole, reload: load };
}
