import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Building2, KeyRound } from "lucide-react";
import { rpc, useFreight } from "@/lib/freight";
import { ErrorNote, Field, FButton, FInput, FSelect, Logo } from "@/components/freight/ui";

export const Route = createFileRoute("/freight-workspace")({
  head: () => ({ meta: [{ title: "Set up your company — Hercules Freight OS" }, { name: "description", content: "Create a company or join one with an invitation." }] }),
  component: Onboarding,
});

const TYPES = [
  { v: "carrier", l: "Carrier (dispatch your own trucks)" },
  { v: "fleet", l: "Fleet owner" },
  { v: "owner_operator", l: "Owner-operator" },
  { v: "broker", l: "Freight broker" },
  { v: "shipper", l: "Shipper" },
];

function Onboarding() {
  const { refresh, companies, email } = useFreight();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [type, setType] = useState("carrier");
  const [token, setToken] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("invite") ?? "" : ""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const done = async () => {
    await refresh();
    void navigate({ to: "/dashboard" });
  };
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await rpc("freight_company_create", { _name: name, _business_type: type });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    await done();
  };
  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await rpc("freight_invite_accept", { _token: token.trim() });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    await done();
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold">Set up your workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {email}. {companies.length ? "You can add another company." : "Create a company, or join one with the invitation code your admin sent you."}
      </p>
      <div role="tablist" className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-1">
        {(["create", "join"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {m === "create" ? <Building2 className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {m === "create" ? "Create a company" : "Join with invitation"}
          </button>
        ))}
      </div>
      <div className="hfo-card mt-4 p-6">
        {mode === "create" ? (
          <form onSubmit={create} className="space-y-4">
            <Field label="Company name" required><FInput required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Business type" hint="You'll be the company admin. Other people join by invitation with the role you give them.">
              <FSelect value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </FSelect>
            </Field>
            {err && <ErrorNote>{err}</ErrorNote>}
            <FButton type="submit" busy={busy} size="lg" className="w-full">Create company</FButton>
          </form>
        ) : (
          <form onSubmit={join} className="space-y-4">
            <Field label="Invitation code" hint="Invitations work once, expire, and only for the email they were sent to." required>
              <FInput required value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            {err && <ErrorNote>{err}</ErrorNote>}
            <FButton type="submit" busy={busy} size="lg" className="w-full">Join company</FButton>
          </form>
        )}
      </div>
      {companies.length > 0 && <FButton variant="ghost" className="mt-4" onClick={() => navigate({ to: "/dashboard" })}>Back to workspace</FButton>}
    </div>
  );
}
