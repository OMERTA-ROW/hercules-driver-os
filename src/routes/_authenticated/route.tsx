import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FreightProvider, useFreight } from "@/lib/freight";
import { FreightShell } from "@/components/freight/Shell";
import { Loading } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login", search: { next: location.pathname } });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  return (
    <FreightProvider>
      <Gate />
    </FreightProvider>
  );
}

function Gate() {
  const { ready, companies } = useFreight();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const onboarding = path === "/onboarding";
  useEffect(() => {
    if (ready && companies.length === 0 && !onboarding) void navigate({ to: "/onboarding", replace: true });
  }, [ready, companies.length, onboarding, navigate]);

  if (onboarding) return <div className="hfo"><Outlet /></div>;
  if (!ready || companies.length === 0)
    return (
      <div className="hfo grid place-items-center">
        <Loading label="Opening your workspace" />
      </div>
    );
  return (
    <FreightShell>
      <Outlet />
    </FreightShell>
  );
}
