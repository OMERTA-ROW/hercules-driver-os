import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { ROLE_LABEL, rpc, useFreight, useTeam, when, type FreightRole } from "@/lib/freight";
import { useInvalidate, useRows } from "@/lib/freight-data";
import { Badge, Card, ErrorNote, Field, FButton, FInput, FSelect, Loading, PageHeader, Table, Td } from "@/components/freight/ui";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Hercules Freight OS" }, { name: "description", content: "Team, invitations, roles and audit log." }] }),
  component: Admin,
});

type Invite = { id: string; email: string; role: string; expires_at: string; used_at: string | null; revoked: boolean; created_at: string };
type Audit = { id: string; action: string; entity: string; created_at: string; detail: Record<string, unknown> | null };

function Admin() {
  const { company, has, userId } = useFreight();
  const team = useTeam(company?.id);
  const invites = useRows<Invite>("freight_invites", company?.id, { select: "id,email,role,expires_at,used_at,revoked,created_at" });
  const audit = useRows<Audit>("freight_audit_log", company?.id, { limit: 50 });
  const inv = useInvalidate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FreightRole>("driver");
  const [hours, setHours] = useState("72");
  const [token, setToken] = useState<string | null>(null);
  if (!has("admin")) return <ErrorNote>Only company admins can open Admin.</ErrorNote>;
  if (team.isLoading) return <Loading />;

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const r = await rpc("freight_invite_create", { _company: company!.id, _email: email, _role: role, _hours: Number(hours) });
    if (!r.ok) return toast.error(r.message);
    setToken(String(r["token"]));
    setEmail("");
    void inv();
  };
  const revokeInvite = async (id: string) => {
    const r = await rpc("freight_invite_revoke", { _invite: id });
    r.ok ? toast.success("Invitation cancelled.") : toast.error(r.message);
    void inv();
  };
  const revokeRole = async (u: string, r: string) => {
    if (!window.confirm(`Remove the ${ROLE_LABEL[r as FreightRole]} role?`)) return;
    const res = await rpc("freight_role_revoke", { _company: company!.id, _user: u, _role: r });
    res.ok ? toast.success("Role removed.") : toast.error(res.message);
    void inv();
  };
  const link = token ? `${window.location.origin}/onboarding?invite=${encodeURIComponent(token)}` : "";

  return (
    <>
      <PageHeader title="Admin" sub={company?.name} />
      <Card className="mb-6">
        <h2 className="text-lg font-semibold">Invite someone</h2>
        <p className="text-sm text-muted-foreground">Invitations are single-use, expire, and only work for the email you enter. Email delivery isn't connected, so share the link yourself.</p>
        <form onSubmit={invite} className="mt-3 grid gap-3 md:grid-cols-4">
          <Field label="Email" required><FInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role"><FSelect value={role} onChange={(e) => setRole(e.target.value as FreightRole)}>{(Object.keys(ROLE_LABEL) as FreightRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</FSelect></Field>
          <Field label="Expires after"><FSelect value={hours} onChange={(e) => setHours(e.target.value)}><option value="24">1 day</option><option value="72">3 days</option><option value="168">7 days</option><option value="336">14 days</option></FSelect></Field>
          <div className="flex items-end"><FButton type="submit" className="w-full">Create invitation</FButton></div>
        </form>
        {token && (
          <div className="mt-4 rounded-lg border border-gold/50 bg-surface p-3 text-sm">
            <p className="font-semibold">Copy this link now — it won't be shown again.</p>
            <div className="mt-2 flex gap-2"><FInput readOnly value={link} aria-label="Invitation link" onFocus={(e) => e.target.select()} /><FButton variant="outline" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Copied."); }}><Copy />Copy</FButton></div>
          </div>
        )}
      </Card>

      <h2 className="mb-2 text-lg font-semibold">Team</h2>
      <Table head={["Person", "Roles"]}>
        {(team.data ?? []).map((m) => (
          <tr key={m.user_id} className="border-t border-border">
            <Td><p className="font-medium">{m.name ?? "—"}{m.user_id === userId && " (you)"}</p><p className="text-xs text-muted-foreground">{m.email}</p></Td>
            <Td><div className="flex flex-wrap gap-1">{m.roles.map((r) => <button key={r} onClick={() => revokeRole(m.user_id, r)} className="rounded-full" aria-label={`Remove ${ROLE_LABEL[r]} role from ${m.name ?? m.email}`}><Badge>{ROLE_LABEL[r]} ×</Badge></button>)}</div></Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Invitations</h2>
      {!invites.data?.length ? <p className="text-sm text-muted-foreground">No invitations yet.</p> : (
        <Table head={["Email", "Role", "Expires", "Status", ""]}>
          {invites.data.map((i) => {
            const st = i.revoked ? "cancelled" : i.used_at ? "used" : new Date(i.expires_at) < new Date() ? "expired" : "open";
            return (
              <tr key={i.id} className="border-t border-border">
                <Td>{i.email}</Td><Td>{ROLE_LABEL[i.role as FreightRole]}</Td><Td>{when(i.expires_at)}</Td>
                <Td><Badge tone={st === "open" ? "info" : st === "used" ? "ok" : "neutral"}>{st}</Badge></Td>
                <Td>{st === "open" && <FButton size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}>Cancel</FButton>}</Td>
              </tr>
            );
          })}
        </Table>
      )}

      <h2 className="mb-2 mt-8 text-lg font-semibold">Audit log</h2>
      {!audit.data?.length ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
        <ul className="hfo-card divide-y divide-border p-0 text-sm">
          {audit.data.map((a) => <li key={a.id} className="flex justify-between gap-3 p-3"><span>{a.entity} · {a.action.replace(/_/g, " ")}</span><span className="text-muted-foreground">{when(a.created_at)}</span></li>)}
        </ul>
      )}
    </>
  );
}
