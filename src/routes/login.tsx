import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { ErrorNote, Field, FButton, FInput } from "@/components/freight/ui";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? (s["next"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — Hercules Freight OS" },
      { name: "description", content: "Sign in to your Hercules Freight OS workspace." },
      { property: "og:title", content: "Sign in — Hercules Freight OS" },
      { property: "og:description", content: "Sign in to dispatch, drive and manage freight." },
    ],
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(error.message.includes("confirm") ? "Confirm your email first, then sign in." : "Email or password is incorrect.");
    void navigate({ to: next ?? "/dashboard" });
  };
  return (
    <AuthFrame title="Welcome back" sub="Sign in to your freight workspace." foot={<>New to Hercules? <Link to="/signup" className="font-semibold text-primary underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><FInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><FInput type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <FButton type="submit" busy={busy} className="w-full" size="lg">Sign in</FButton>
        <Link to="/forgot-password" className="block text-center text-sm font-semibold text-primary underline">Forgot password?</Link>
      </form>
    </AuthFrame>
  );
}
