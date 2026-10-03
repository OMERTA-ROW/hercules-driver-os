import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { ErrorNote, Field, FButton, FInput } from "@/components/freight/ui";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Hercules Freight OS" },
      { name: "description", content: "Get a link to reset your Hercules Freight OS password." },
      { property: "og:title", content: "Reset password — Hercules Freight OS" },
      { property: "og:description", content: "Reset your password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) setErr("We couldn't send the link just now. Try again shortly.");
    else setDone(true);
  };
  return (
    <AuthFrame title="Reset your password" sub="We'll email you a secure link." foot={<Link to="/login" className="font-semibold text-primary underline">Back to sign in</Link>}>
      {done ? (
        <p className="hfo-card p-5 text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><FInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {err && <ErrorNote>{err}</ErrorNote>}
          <FButton type="submit" busy={busy} size="lg" className="w-full">Send reset link</FButton>
        </form>
      )}
    </AuthFrame>
  );
}
