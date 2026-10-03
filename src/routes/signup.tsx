import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthFrame } from "@/components/freight/AuthFrame";
import { ErrorNote, Field, FButton, FInput } from "@/components/freight/ui";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Hercules Freight OS" },
      { name: "description", content: "Create a Hercules Freight OS account, then create a company or join one by invitation." },
      { property: "og:title", content: "Create account — Hercules Freight OS" },
      { property: "og:description", content: "Start your freight workspace." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErr("Use at least 8 characters for your password.");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: name.trim() } },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  };

  if (sent)
    return (
      <AuthFrame title="Check your email" foot={<Link to="/login" className="font-semibold text-primary underline">Back to sign in</Link>}>
        <div className="hfo-card flex gap-3 p-5">
          <MailCheck className="h-5 w-5 shrink-0 text-ok" />
          <p className="text-sm">We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account, then you'll set up or join your company.</p>
        </div>
      </AuthFrame>
    );

  return (
    <AuthFrame title="Create your account" sub="You'll create a company or join one by invitation next." foot={<>Already have an account? <Link to="/login" className="font-semibold text-primary underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" required><FInput required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Work email" required><FInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" hint="At least 8 characters." required><FInput type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err && <ErrorNote>{err}</ErrorNote>}
        <FButton type="submit" busy={busy} size="lg" className="w-full">Create account</FButton>
      </form>
    </AuthFrame>
  );
}
