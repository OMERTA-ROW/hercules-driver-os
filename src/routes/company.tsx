import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Check, Copy, KeyRound, Plug, Truck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  EmptyState,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  useCompanyActions,
  useInvites,
  useMemberships,
  useRoster,
  type CompanyRole,
} from "@/lib/company";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "Company & Dispatch — HERCULES" },
      {
        name: "description",
        content:
          "Join your carrier's dispatch with an invite code, connect as a leased owner-operator, or create and run your own fleet with expiring driver invitations.",
      },
      { property: "og:title", content: "Company & Dispatch — HERCULES" },
      {
        property: "og:description",
        content: "Three ways to onboard: company driver, leased operator, or fleet owner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyPage,
});

const roleLabel: Record<CompanyRole, string> = {
  owner: "Owner",
  dispatcher: "Dispatcher",
  driver: "Company driver",
  leased: "Leased owner-operator",
};

function CompanyPage() {
  const { account, ready } = useAuth();
  const { active, pending, managed, driving, isLoading, error } = useMemberships();
  const actions = useCompanyActions();
  const [code, setCode] = useState("");
  const [fleetName, setFleetName] = useState("");
  const [dot, setDot] = useState("");
  const [mc, setMc] = useState("");
  const [inviteRole, setInviteRole] = useState<"driver" | "leased" | "dispatcher">("driver");
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteUses, setInviteUses] = useState(1);

  const roster = useRoster(managed?.companyId ?? null);
  const invites = useInvites(managed?.companyId ?? null);

  if (!ready || isLoading) {
    return (
      <AppShell title="Company & dispatch" subtitle="Reading your company link">
        <Panel>
          <p className="text-sm text-muted-foreground">One moment…</p>
        </Panel>
      </AppShell>
    );
  }

  if (!account) {
    return (
      <AppShell title="Company & dispatch" subtitle="Sign in to connect to a carrier">
        <Panel>
          <EmptyState
            title="Sign in first"
            body="Your company link belongs to your account, so you need to be signed in to join a carrier or start a fleet."
          />
          <div className="mt-3 flex gap-2">
            <Button asChild size="lg">
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/sign-up">Create account</Link>
            </Button>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const joining = actions.join.isPending;
  const creating = actions.createCompany.isPending;

  async function submitJoin() {
    if (code.trim().length < 4) {
      toast.error("Enter the code your carrier gave you");
      return;
    }
    const res = await actions.join.mutateAsync(code.trim());
    if (!res.ok) {
      toast.error("Not joined", { description: res.message });
      return;
    }
    const raw = res.raw as { status?: string; company?: string; role?: string } | undefined;
    setCode("");
    if (raw?.status === "pending") {
      toast.success("Request sent", {
        description: `${raw.company ?? "The carrier"} has to approve you before dispatch shows up.`,
      });
    } else {
      toast.success(`Connected to ${raw?.company ?? "your carrier"}`);
    }
  }

  async function submitCreate() {
    const res = await actions.createCompany.mutateAsync({
      name: fleetName,
      dot: dot || undefined,
      mc: mc || undefined,
    });
    if (!res.ok) {
      toast.error("Fleet not created", { description: res.message });
      return;
    }
    setFleetName("");
    setDot("");
    setMc("");
    toast.success("Fleet created", { description: "Invite your drivers below." });
  }

  return (
    <AppShell
      title="Company & dispatch"
      subtitle={
        driving
          ? `${driving.company.name} · ${roleLabel[driving.role]}`
          : managed
            ? `${managed.company.name} · ${roleLabel[managed.role]}`
            : "Join a carrier or start your own fleet"
      }
    >
      <div className="mx-auto grid max-w-3xl gap-3">
        {error ? (
          <div className="rounded-lg border border-stop/40 bg-stop/10 p-3 text-sm">{error}</div>
        ) : null}

        {/* PENDING APPROVAL */}
        {pending.map((m) => (
          <Panel key={m.id}>
            <PanelTitle right={<Pill tone="warn">Waiting</Pill>}>
              {m.company.name} — approval pending
            </PanelTitle>
            <p className="text-sm text-muted-foreground">
              You asked to join as {roleLabel[m.role].toLowerCase()}. Nothing from their dispatch
              shows up until an owner or dispatcher there approves you. You keep your own screens in
              the meantime.
            </p>
          </Panel>
        ))}

        {/* CONNECTED AS DRIVER OR LEASED OPERATOR */}
        {driving ? (
          <Panel>
            <PanelTitle right={<Pill tone="go">Connected</Pill>}>
              {driving.company.name}
            </PanelTitle>
            <ul className="space-y-1 text-sm">
              <li>
                <Label>Your role</Label> {roleLabel[driving.role]}
              </li>
              <li>
                <Label>Company code</Label> {driving.company.code}
              </li>
              {driving.company.dotNumber ? (
                <li>
                  <Label>DOT</Label> {driving.company.dotNumber}
                </li>
              ) : null}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              You can see loads and equipment this carrier shares with its members, and nothing from
              any other company.
            </p>
            <LoadBoardState connected={driving.company.loadBoardConnected} />
            <div className="mt-3">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const res = await actions.removeMember.mutateAsync(driving.id);
                    toast[res.ok ? "success" : "error"](
                      res.ok ? "You left the company" : "Could not leave",
                      res.ok ? undefined : { description: res.message },
                    );
                  })();
                }}
              >
                Leave this company
              </Button>
            </div>
          </Panel>
        ) : null}

        {/* THE THREE ONBOARDING PATHS */}
        {!driving && !managed ? (
          <>
            <Panel>
              <PanelTitle right={<Pill tone="primary">Path 1 & 2</Pill>}>
                Join a carrier with a code
              </PanelTitle>
              <p className="text-sm text-muted-foreground">
                Company drivers joining dispatch and leased owner-operators joining a carrier's load
                board both use the invite code the carrier issues. The code decides which of the two
                you are — you can't grant yourself a role, and codes expire.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <Label>Invite code</Label>
                  <Input
                    value={code}
                    aria-label="Invite code"
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="8 characters"
                    className="mt-1 h-12 text-base tracking-[0.2em]"
                  />
                </div>
                <Button size="lg" disabled={joining} onClick={() => void submitJoin()}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {joining ? "Checking…" : "Join carrier"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Don't have a code? Ask your dispatcher to send you one from their HERCULES fleet
                screen. Until then everything on your own account still works.
              </p>
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="primary">Path 3</Pill>}>Start your own fleet</PanelTitle>
              <p className="text-sm text-muted-foreground">
                Create the company, then invite your drivers and leased operators. You become its
                owner; only an owner can add a dispatcher.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Label>Company name</Label>
                  <Input
                    value={fleetName}
                    aria-label="Company name"
                    onChange={(e) => setFleetName(e.target.value)}
                    placeholder="Bass Transport LLC"
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div>
                  <Label>DOT number (optional)</Label>
                  <Input
                    value={dot}
                    aria-label="DOT number"
                    onChange={(e) => setDot(e.target.value)}
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div>
                  <Label>MC number (optional)</Label>
                  <Input
                    value={mc}
                    aria-label="MC number"
                    onChange={(e) => setMc(e.target.value)}
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div className="flex items-end">
                  <Button size="lg" disabled={creating} onClick={() => void submitCreate()}>
                    <Building2 className="mr-2 h-4 w-4" />
                    {creating ? "Creating…" : "Create fleet"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                We don't verify DOT or MC numbers against any government system — they are recorded
                as you enter them.
              </p>
            </Panel>
          </>
        ) : null}

        {/* FLEET MANAGEMENT */}
        {managed ? (
          <>
            <Panel>
              <PanelTitle
                right={<Pill tone="go">{roleLabel[managed.role]}</Pill>}
              >
                {managed.company.name}
              </PanelTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Label>Company code</Label>
                <span className="metric text-lg text-primary">{managed.company.code}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(managed.company.code);
                    toast.success("Code copied");
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The code identifies your company. It does not let anyone in on its own — drivers join
                only with an invite you issue below, and you approve each one.
              </p>
              <LoadBoardState connected={managed.company.loadBoardConnected} />
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="primary">Invitations</Pill>}>Invite people</PanelTitle>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label>Role</Label>
                  <div className="mt-1 flex gap-1">
                    {(["driver", "leased", "dispatcher"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={inviteRole === r}
                        onClick={() => setInviteRole(r)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-xs uppercase tracking-[0.1em]",
                          inviteRole === r
                            ? "border-primary/60 bg-primary/12 text-primary"
                            : "border-border bg-card/50",
                        )}
                      >
                        {roleLabel[r]}
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
                <div className="w-24">
                  <Label>Uses</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    aria-label="Uses"
                    value={inviteUses}
                    onChange={(e) =>
                      setInviteUses(Math.min(200, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <Button
                  size="lg"
                  disabled={actions.createInvite.isPending || inviteRole === "dispatcher" && managed.role !== "owner"}
                  onClick={() => {
                    void (async () => {
                      const res = await actions.createInvite.mutateAsync({
                        companyId: managed.companyId,
                        role: inviteRole,
                        expiresHours: inviteDays * 24,
                        maxUses: inviteUses,
                      });
                      toast[res.ok ? "success" : "error"](
                        res.ok ? "Invite ready — copy the code below" : "Invite not created",
                        res.ok ? undefined : { description: res.message },
                      );
                    })();
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Create invite
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {(invites.data ?? []).length === 0 ? (
                  <EmptyState
                    title="No invites yet"
                    body="Create one above and hand the code to your driver. It expires on its own."
                  />
                ) : null}
                {(invites.data ?? []).map((iv) => {
                  const expired = new Date(iv.expiresAt).getTime() <= Date.now();
                  const dead = iv.revoked || expired || iv.usedCount >= iv.maxUses;
                  return (
                    <div
                      key={iv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="metric text-base tracking-[0.2em] text-primary">{iv.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {roleLabel[iv.role]} · {iv.usedCount}/{iv.maxUses} used ·{" "}
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
                            toast.success("Invite code copied");
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
                                  res.ok ? "Invite cancelled" : "Could not cancel",
                                  res.ok ? undefined : { description: res.message },
                                );
                              })();
                            }}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="primary">Roster</Pill>}>Your people</PanelTitle>
              <div className="space-y-2">
                {(roster.data ?? []).length === 0 ? (
                  <EmptyState title="Nobody yet" body="Invited drivers show up here to approve." />
                ) : null}
                {(roster.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-sm uppercase tracking-[0.1em]">
                        {m.name ?? m.email ?? "Driver on file"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabel[m.role]} ·{" "}
                        {m.status === "pending" ? "waiting for approval" : "active"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {m.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              void (async () => {
                                const res = await actions.decideMember.mutateAsync({
                                  memberId: m.id,
                                  approve: true,
                                });
                                toast[res.ok ? "success" : "error"](
                                  res.ok ? "Approved" : "Could not approve",
                                  res.ok ? undefined : { description: res.message },
                                );
                              })();
                            }}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void (async () => {
                                const res = await actions.decideMember.mutateAsync({
                                  memberId: m.id,
                                  approve: false,
                                });
                                toast[res.ok ? "success" : "error"](
                                  res.ok ? "Declined" : "Could not decline",
                                  res.ok ? undefined : { description: res.message },
                                );
                              })();
                            }}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      ) : m.role !== "owner" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void (async () => {
                              const res = await actions.removeMember.mutateAsync(m.id);
                              toast[res.ok ? "success" : "error"](
                                res.ok ? "Removed" : "Could not remove",
                                res.ok ? undefined : { description: res.message },
                              );
                            })();
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <DriverApprovedNote>
                  Nobody joins your fleet without a code you issued and an approval you gave.
                </DriverApprovedNote>
              </div>
            </Panel>
          </>
        ) : null}

        {active.length > 0 ? (
          <Panel>
            <PanelTitle right={<Pill tone="primary">Next</Pill>}>Keep going</PanelTitle>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" variant="outline">
                <Link to="/equipment">
                  <Truck className="mr-2 h-4 w-4" /> Your equipment
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/loads">Load board</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/welcome">Setup checklist</Link>
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}

/** Truthful state for an outside load-board connection. Nothing is connected. */
function LoadBoardState({ connected }: { connected: boolean }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-muted-foreground" />
        <Label>Outside load board</Label>
        <Pill tone={connected ? "go" : "warn"}>{connected ? "Connected" : "Not connected"}</Pill>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {connected
          ? "This company has an outside load-board connection recorded on its account."
          : "No outside load board or dispatch system is connected to HERCULES. Loads shown here are the ones posted inside this app by your own company — nothing is pulled from or pushed to an outside service."}
      </p>
    </div>
  );
}
