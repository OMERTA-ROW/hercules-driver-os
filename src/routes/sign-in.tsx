import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn, Truck, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, DriverApprovedNote, Pill } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { doors, companyByCode, type AccountKind } from "@/data/accounts";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";
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
  const [code, setCode] = useState("");

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
          <ThemeToggle size="sm" />
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
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      kind === d.kind
                        ? "border-primary/60 bg-primary/12"
                        : "border-border bg-card/50 hover:bg-accent",
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
                if (kind === "companyDriver" && code.trim()) {
                  const company = companyByCode(code);
                  if (!company) {
                    toast.error("That company code isn't recognised", {
                      description: "Check it with your carrier, or sign in without it.",
                    });
                    return;
                  }
                  signUp({
                    name: email.split("@")[0] ?? "Driver",
                    email,
                    plan: "company",
                    kind: "companyDriver",
                    companyCode: code,
                  });
                  toast.success(`Linked to ${company.name}`, {
                    description: "You're flagged as a company driver on the shared model.",
                  });
                } else {
                  signIn(email, kind);
                  toast.success(`Signed in — ${door.name}`);
                }
                void navigate({ to: kind === "zeusFleet" ? "/zeus" : "/" });
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
              {kind === "companyDriver" ? (
                <div>
                  <Label>Company code (optional)</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    aria-label="Company code"
                    placeholder="SOON-4412"
                    className="mt-1 h-12 text-base"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your carrier's code links you into their rotation on ZEUS. Without it you still
                    get the full driver experience on your own.
                  </p>
                </div>
              ) : null}
              <Button type="submit" size="lg" className="w-full gap-2">
                <LogIn className="h-4 w-4" /> Sign in to {door.name}
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
                Demo sign-in. Nothing is charged and nothing is committed without your approval.
              </DriverApprovedNote>
            </form>
          </div>
        </Panel>
      </div>
    </main>
  );
}
