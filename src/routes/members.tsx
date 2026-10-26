import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, ShieldCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Pill, Label, EmptyState } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  useCompanyActions,
  useInvites,
  useMemberships,
  useRoster,
  type CompanyRole,
  type RosterMember,
} from "@/lib/company";
import { roleLabels, useAccess, type HerculesRole } from "@/lib/access";
import {
  assignableRoles,
  checkRoleAssignment,
  inviteIsDead,
  validateInvite,
} from "@/lib/members-admin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Members & Invitations — HERCULES" },
      {
        name: "description",
        content:
          "Owner-only member administration: single-use email-bound invitations, approvals, removals, and minimal role assignment.",
      },
      { property: "og:title", content: "Members & Invitations — HERCULES" },
      {
        property: "og:description",
        content: "Private account administration for company owners and admins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembersPage,
});

const companyRoleLabel: Record<CompanyRole, string> = {
  owner: "Owner",
  dispatcher: "Dispatcher",
  driver: "Company driver",
  leased: "Leased owner-operator",
};

function MembersPage() {
  const { account, ready } = useAuth();
  const access = useAccess();
  const { managed, isLoading } = useMemberships();
  const actions = useCompanyActions();
  const qc = useQueryClient();

  const canManage = managed?.role === "owner" || managed?.role === "dispatcher";
  const roster = useRoster(canManage ? (managed?.companyId ?? null) : null, canManage);
  const invites = useInvites(canManage ? (managed?.companyId ?? null) : null);

  const [inviteRole, setInviteRole] = useState<"driver" | "leased" | "dispatcher">("driver");
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteEmail, setInviteEmail] = useState("");

  if (!ready || isLoading) {
    return (
      <AppShell title="Members & invitations" subtitle="Reading your company link">
        <Panel>
          <p className="text-sm text-muted-foreground">One moment…</p>
        </Panel>
      </AppShell>
    );
  }

  if (!account) {
    return (
      <AppShell title="Members & invitations" subtitle="Sign in to manage your people">
        <Panel>
          <EmptyState title="Sign in first">
            {"Member administration belongs to a signed-in owner or admin account."}
          </EmptyState>
          <div className="mt-3 flex gap-2">
            <Button asChild size="lg">
              <Link to="/sign-in" search={{ next: "/members" }}>
                Sign in
              </Link>
            </Button>
          </div>
        </Panel>
      </AppShell>
    );
  }

  if (!managed || !canManage) {
    return (
      <AppShell title="Members & invitations" subtitle="Owner access required">
        <Panel>
          <EmptyState title="No company to manage">
            {
              "You manage members and invitations from the company you own or administer. Create a fleet on the Company page first, or ask your company owner for access."
            }
          </EmptyState>
          <div className="mt-3">
            <Button asChild size="lg" variant="outline">
              <Link to="/company">Open Company & dispatch</Link>
            </Button>
          </div>
        </Panel>
      </AppShell>
    );
  }

  async function submitInvite() {
    const check = validateInvite({
      role: inviteRole,
      expiresDays: inviteDays,
      maxUses: 1,
      ...(inviteEmail.trim() ? { email: inviteEmail.trim() } : {}),
    });
    if (check) {
      toast.error("Invite not created", { description: check });
      return;
    }
    const res = await actions.createInvite.mutateAsync({
      companyId: managed!.companyId,
      role: inviteRole,
      expiresHours: inviteDays * 24,
      maxUses: 1,
      ...(inviteEmail.trim() ? { email: inviteEmail.trim() } : {}),
    });
    if (res.ok) {
      setInviteEmail("");
      toast.success("Invitation ready", {
        description: "Copy the code below and hand it to your tester. It works once, then dies.",
      });
    } else {
      toast.error("Invite not created", { description: res.message });
    }
  }

  return (
    <AppShell
      title="Members & invitations"
      subtitle={`${managed.company.name} · ${companyRoleLabel[managed.role]}`}
    >
      <div className="mx-auto grid max-w-3xl gap-3">
        {/* INVITATIONS */}
        <Panel>
          <PanelTitle right={<Pill tone="primary">Single-use</Pill>}>Invite a tester</PanelTitle>
          <p className="text-sm text-muted-foreground">
            Each invitation is a code you copy and hand over yourself — nothing is emailed. It works
            once, expires on its own, and can be bound to one email address so only that person can
            redeem it. The invitee sets their own password; you never see or choose it.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <Label>Role</Label>
              <div className="bubble-bar bubble-scroll mt-1">
                {(["driver", "leased", "dispatcher"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={inviteRole === r}
                    onClick={() => setInviteRole(r)}
                    className={cn("bubble-tab", inviteRole === r && "bubble-tab-on")}
                  >
                    {companyRoleLabel[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-24">
              <Label>Expires (days)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                aria-label="Expires in days"
                value={inviteDays}
                onChange={(e) =>
                  setInviteDays(Math.min(30, Math.max(1, Number(e.target.value) || 7)))
                }
                className="mt-1 h-12 text-base"
              />
            </div>
            <div className="min-w-[14rem] flex-1">
              <Label>Bind to email (optional)</Label>
              <Input
                type="email"
                aria-label="Bind to email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="tester@example.com"
                className="mt-1 h-12 text-base"
              />
            </div>
            <Button
              size="lg"
              disabled={
                actions.createInvite.isPending ||
                (inviteRole === "dispatcher" && managed.role !== "owner")
              }
              onClick={() => void submitInvite()}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {actions.createInvite.isPending ? "Creating…" : "Create invitation"}
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {(invites.data ?? []).length === 0 ? (
              <EmptyState title="No invitations yet">
                {"Create one above. It appears here with its status until it is used or cancelled."}
              </EmptyState>
            ) : null}
            {(invites.data ?? []).map((iv) => {
              const dead = inviteIsDead(iv);
              const expired = new Date(iv.expiresAt).getTime() <= Date.now();
              return (
                <div
                  key={iv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="metric text-base tracking-[0.2em] text-primary">{iv.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {companyRoleLabel[iv.role]} · {iv.usedCount}/{iv.maxUses} used ·{" "}
                      {iv.revoked
                        ? "cancelled"
                        : expired
                          ? "expired"
                          : `expires ${new Date(iv.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(iv.code);
                        toast.success("Invitation code copied");
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                    </Button>
                    {!dead ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void (async () => {
                            const res = await actions.revokeInvite.mutateAsync(iv.id);
                            toast[res.ok ? "success" : "error"](
                              res.ok ? "Invitation cancelled" : "Could not cancel",
                              res.ok ? undefined : { description: res.message },
                            );
                          })();
                        }}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* MEMBERS */}
        <Panel>
          <PanelTitle right={<Pill tone="primary">Roster</Pill>}>Members</PanelTitle>
          <div className="space-y-2">
            {(roster.data ?? []).length === 0 ? (
              <EmptyState title="Nobody yet">
                {"People who redeem an invitation show up here for approval."}
              </EmptyState>
            ) : null}
            {(roster.data ?? []).map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                actorId={account.id}
                onDecide={(approve) => {
                  void (async () => {
                    const res = await actions.decideMember.mutateAsync({
                      memberId: m.id,
                      approve,
                    });
                    toast[res.ok ? "success" : "error"](
                      res.ok ? (approve ? "Approved" : "Declined") : "Could not save",
                      res.ok ? undefined : { description: res.message },
                    );
                  })();
                }}
                onRemove={() => {
                  void (async () => {
                    const res = await actions.removeMember.mutateAsync(m.id);
                    toast[res.ok ? "success" : "error"](
                      res.ok ? "Removed" : "Could not remove",
                      res.ok ? undefined : { description: res.message },
                    );
                  })();
                }}
                onRoleChanged={() => void qc.invalidateQueries({ queryKey: ["company-roster"] })}
              />
            ))}
          </div>
        </Panel>

        <p className="text-xs text-muted-foreground">
          Every approval, removal, and role change is checked again in the database and written to
          the access audit log. Platform Admin can never be granted from this screen.
        </p>
      </div>
    </AppShell>
  );
}

function MemberRow({
  member,
  actorId,
  onDecide,
  onRemove,
  onRoleChanged,
}: {
  member: RosterMember;
  actorId: string;
  onDecide: (approve: boolean) => void;
  onRemove: () => void;
  onRoleChanged: () => void;
}) {
  const [role, setRole] = useState<HerculesRole>("driver");
  const [busy, setBusy] = useState(false);
  const isSelf = member.userId === actorId;

  async function setRoleGrant(grant: boolean) {
    const check = checkRoleAssignment(actorId, member.userId, role);
    if (!check.ok) {
      toast.error(
        check.reason === "self"
          ? "You can't change your own roles here"
          : "That role can't be assigned from this screen",
      );
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("hercules_role_set", {
        _target: member.userId,
        _role: role,
        _grant: grant,
      });
      const res = (data ?? {}) as { ok?: boolean; error?: string };
      if (error || !res.ok) {
        toast.error("Role not changed", {
          description: res.error ?? "The database refused that. Nothing was changed.",
        });
        return;
      }
      toast.success(grant ? `${roleLabels[role]} granted` : `${roleLabels[role]} removed`);
      onRoleChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm uppercase tracking-[0.1em]">
            {member.name ?? member.email ?? "Driver on file"}
            {isSelf ? " (you)" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {companyRoleLabel[member.role]} ·{" "}
            {member.status === "pending" ? "waiting for approval" : member.status}
          </p>
        </div>
        <div className="flex gap-2">
          {member.status === "pending" ? (
            <>
              <Button size="sm" onClick={() => onDecide(true)}>
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecide(false)}>
                <X className="mr-1 h-3.5 w-3.5" /> Decline
              </Button>
            </>
          ) : member.role !== "owner" && !isSelf ? (
            <Button size="sm" variant="outline" onClick={onRemove}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {member.status === "active" && !isSelf ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <Label>
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> App role
          </Label>
          <select
            aria-label="Role to assign"
            className="min-h-11 rounded-full border border-border bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as HerculesRole)}
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void setRoleGrant(true)}>
            <KeyRound className="mr-1 h-3.5 w-3.5" /> Grant
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void setRoleGrant(false)}
          >
            Revoke
          </Button>
        </div>
      ) : null}
    </div>
  );
}
