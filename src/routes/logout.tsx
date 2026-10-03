import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { Loading } from "@/components/freight/ui";

export const Route = createFileRoute("/logout")({
  head: () => ({
    meta: [
      { title: "Signing out — Hercules Freight OS" },
      { name: "description", content: "Signing out of Hercules Freight OS." },
      { property: "og:title", content: "Signing out — Hercules Freight OS" },
      { property: "og:description", content: "Signing out." },
    ],
  }),
  component: Logout,
});

function Logout() {
  const navigate = useNavigate();
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    void (async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      localStorage.removeItem("hfo.company");
      localStorage.removeItem("hfo.role");
      await router.invalidate();
      void navigate({ to: "/login", replace: true });
    })();
  }, [navigate, queryClient, router]);
  return (
    <AuthFrame title="Signing out">
      <Loading label="Clearing your session" />
    </AuthFrame>
  );
}
