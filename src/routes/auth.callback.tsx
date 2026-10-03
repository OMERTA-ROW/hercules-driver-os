import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { Loading } from "@/components/freight/ui";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in — Hercules Freight OS" },
      { name: "description", content: "Finishing sign-in." },
      { property: "og:title", content: "Signing in — Hercules Freight OS" },
      { property: "og:description", content: "Finishing sign-in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const n = sessionStorage.getItem("hfo.next");
      sessionStorage.removeItem("hfo.next");
      void navigate({ to: n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard", replace: true });
    };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && go());
    void supabase.auth.getSession().then(({ data: s }) => s.session && go());
    const t = setTimeout(() => !done && setFailed(true), 8000);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, [navigate]);
  return (
    <AuthFrame title={failed ? "Sign-in didn't finish" : "Signing you in"}>
      {failed ? <p className="text-sm text-muted-foreground">The link may have expired. <a className="font-semibold text-primary underline" href="/login">Sign in again</a>.</p> : <Loading label="Confirming your session" />}
    </AuthFrame>
  );
}
