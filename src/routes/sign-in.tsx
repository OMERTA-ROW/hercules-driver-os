import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn, Truck, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, DriverApprovedNote, Pill } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { doors, type AccountKind } from "@/data/accounts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In — HERCULES & ZEUS" },
      {
        name: "description",
        content:
          "Three doors into one system: HERCULES Solo for owner-operators, HERCULES Company Driver, and ZEUS Fleet for carriers onboarding their own drivers.",
      },
      { property: "og:title", content: "Sign In — HERCULES & ZEUS" },
      {
        property: "og:description",
        content: "Same shared model, separate login doors, separate permissions.",
      },
    ],
  }),
  component: SignIn,
});

const doorIcon: Record<AccountKind, typeof Truck> = {
  solo: Truck,
  companyDriver: User,
  zeusFleet: Building2,
};

function SignIn() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<AccountKind>("solo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const door = doors.find((d) => d.kind === kind)!;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-3xl font-bold uppercase tracking-[0.14em] text-primary"
          >
            HERC<span className="text-foreground">ULES</span>
          </Link>
        </div>

        <Panel>
          <Label>Sign in</Label>
          <h1 className="mt-1 text-2xl font-bold uppercase">Pick your door</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            HERCULES and ZEUS share one system. The door you come through sets what you can reach.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* DOORS */}
            <div className="space-y-2">
              {doors.map((d) => {
                const Icon = doorIcon[d.kind];
                return (
                  <button
                    key={d.kind}
                    type="button"
                    aria-pressed={kind === d.kind}
                    onClick={() => setKind(d.kind)}
                    className={cn(
                      "bubble-card w-full p-4 text-left",
                      kind === d.kind && "bubble-card-on",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-display text-base uppercase tracking-[0.1em]">
                        <Icon className="h-5 w-5 text-primary" /> {d.name}
                      </span>
                      <Pill tone={d.brand === "ZEUS" ? "info" : "primary"}>{d.brand}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{d.who}</p>
                    <p className="mt-1 text-xs text-primary">{d.price}</p>
                    {kind === d.kind ? (
                      <ul className="mt-2 space-y-1">
                        {d.limits.map((l) => (
                          <li key={l} className="text-xs text-muted-foreground">
                            · {l}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* CREDENTIALS */}
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email || !password) {
                  toast.error("Enter your email and password");
                  return;
                }
                setBusy(true);
                void (async () => {
                  const { error } = await signIn(email, password, { kind });
                  setBusy(false);
                  if (error) {
                    // Confirmation is required on purpose; say what to do next.
                    if (/confirm/i.test(error)) {
                      toast.error("Confirm your email first", {
                        description: "Open the link we sent you — we can send it again.",
                        action: {
                          label: "Resend",
                          onClick: () =>
                            void navigate({
                              to: "/confirm-email",
                              search: { email: email.trim() },
                            }),
                        },
                      });
                      return;
                    }
                    toast.error("Could not sign you in", { description: error });
                    return;
                  }
                  toast.success(`Signed in — ${door.name}`);
                  void navigate({ to: kind === "solo" ? "/" : "/company" });
                })();
              }}
            >
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={kind === "zeusFleet" ? "dispatch@carrier.com" : "you@carrier.com"}
                  className="mt-1 h-12 text-base"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 h-12 text-base"
                />
              </div>
              {kind !== "solo" ? (
                <p className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
                  You link to a carrier after signing in, using the invite code they issue you.
                  Codes expire and the carrier approves you — nothing here can link you on its own.
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full gap-2" disabled={busy}>
                <LogIn className="h-4 w-4" /> {busy ? "Signing in…" : `Sign in to ${door.name}`}
              </Button>
              {kind === "zeusFleet" ? (
                <p className="text-sm text-muted-foreground">
                  Onboarding a fleet for the first time?{" "}
                  <Link to="/zeus" className="text-primary underline">
                    Start on the ZEUS company side
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No account yet?{" "}
                  <Link to="/sign-up" className="text-primary underline">
                    Start a 7-day free trial
                  </Link>{" "}
                  or{" "}
                  <Link to="/pricing" className="text-primary underline">
                    compare plans
                  </Link>
                  .
                </p>
              )}
              <DriverApprovedNote>
                Your own account, your own data. Nothing is charged and nothing is committed without
                your approval.
              </DriverApprovedNote>
            </form>
          </div>
        </Panel>
      </div>
    </main>
  );
}
