import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { plans, TRIAL_DAYS, type PlanId } from "@/data/plans";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Start Your Free Trial — HERCULES" },
      {
        name: "description",
        content:
          "Create a HERCULES account and pick your tier: Company Driver, Owner-Operator, or Fleet. 7-day free trial, no free plan.",
      },
      { property: "og:title", content: "Start Your Free Trial — HERCULES" },
      {
        property: "og:description",
        content: "Pick your tier and run 7 days free. Cancel before it ends and pay nothing.",
      },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<PlanId>("owner");
  const [seats, setSeats] = useState(3);

  const selected = plans.find((p) => p.id === plan)!;
  const monthly = plan === "fleet" ? selected.price * Math.max(3, seats) : selected.price;

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
          <Label>Create account</Label>
          <h1 className="mt-1 text-2xl font-bold uppercase">
            {TRIAL_DAYS} days free, then ${monthly}/month
          </h1>

          <form
            className="mt-4 grid gap-4 lg:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name || !email || !password) {
                toast.error("Fill in your name, email, and password");
                return;
              }
              void (async () => {
                const { error, needsConfirmation } = await signUp({
                  name,
                  email,
                  password,
                  plan,
                  seats,
                });
                if (error) {
                  toast.error("Could not create your account", { description: error });
                  return;
                }
                if (needsConfirmation) {
                  toast.success("Check your email to confirm", {
                    description: "Confirm the link we sent, then sign in.",
                  });
                  void navigate({ to: "/sign-in" });
                  return;
                }
                toast.success(`${TRIAL_DAYS}-day trial started`, {
                  description: `${selected.name} — you can change or cancel any time.`,
                });
                void navigate({ to: "/" });
              })();
            }}
          >
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vinson Bass"
                  aria-label="Name"
                  className="mt-1 h-12 text-base"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  aria-label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@carrier.com"
                  className="mt-1 h-12 text-base"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 h-12 text-base"
                />
              </div>
              {plan === "fleet" ? (
                <div>
                  <Label>Trucks (minimum 3)</Label>
                  <Input
                    type="number"
                    min={3}
                    aria-label="Trucks"
                    value={seats}
                    onChange={(e) => setSeats(Math.max(3, Number(e.target.value) || 3))}
                    className="mt-1 h-12 text-base"
                  />
                </div>
              ) : null}
              <Button type="submit" size="lg" className="w-full gap-2">
                <UserPlus className="h-4 w-4" /> Start free trial
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/sign-in" className="text-primary underline">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pick your tier</Label>
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  aria-pressed={plan === p.id}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    plan === p.id
                      ? "border-primary/60 bg-primary/12"
                      : "border-border bg-card/50 hover:bg-accent",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base uppercase tracking-[0.1em]">
                      {p.name}
                    </span>
                    <span className="metric font-bold text-primary">
                      ${p.price}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {p.unit}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.who}</p>
                  {plan === p.id ? (
                    <ul className="mt-2 space-y-1">
                      {p.features.slice(-3).map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs">
                          <Check className="h-3.5 w-3.5 text-go" /> {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </button>
              ))}
              <Link to="/pricing" className="block text-sm text-primary underline">
                See the full comparison
              </Link>
              <DriverApprovedNote>
                No card, no charge, nothing committed without you.
              </DriverApprovedNote>
            </div>
          </form>
        </Panel>
      </div>
    </main>
  );
}
