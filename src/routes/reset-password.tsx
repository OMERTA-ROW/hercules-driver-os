import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { ErrorNote, Field, FButton, FInput } from "@/components/freight/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Hercules Freight OS" },
      { name: "description", content: "Set a new password for your Hercules Freight OS account." },
      { property: "og:title", content: "Choose a new password — Hercules Freight OS" },
      { property: "og:description", content: "Set a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr("That didn't work. Request a new reset link.");
    void navigate({ to: "/dashboard" });
  };
  return (
    <AuthFrame title="Choose a new password">
      {!ready ? (
        <p className="hfo-card p-5 text-sm text-muted-foreground">Open this page from the reset link in your email. Links expire after a short time.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" hint="At least 8 characters."><FInput type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          {err && <ErrorNote>{err}</ErrorNote>}
          <FButton type="submit" busy={busy} size="lg" className="w-full">Save password</FButton>
        </form>
      )}
    </AuthFrame>
  );
}
