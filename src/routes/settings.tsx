import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, Monitor, LogOut, Check, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Pill, DriverApprovedNote } from "@/components/hercules/primitives";
import { ThemePicker, BrightnessPicker } from "@/components/hercules/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { plans, planById, featureLabels, TRIAL_DAYS, type PlanId } from "@/data/plans";
import { cn } from "@/lib/utils";
import { useHazardLayers } from "@/lib/hazard-layer";
import { hazardKinds, hazardMeta } from "@/data/hazards";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Subscription — HERCULES" },
      {
        name: "description",
        content:
          "Manage your HERCULES subscription tier, trial status, and display theme — Night, Gray, or Day.",
      },
      { property: "og:title", content: "Settings & Subscription — HERCULES" },
      {
        property: "og:description",
        content: "Your plan, your trial, your screen brightness. You approve every change.",
      },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { account, trialDaysLeft, changePlan, signOut } = useAuth();
  const navigate = useNavigate();
  const current = account ? planById(account.plan) : null;

  return (
    <AppShell title="Settings" subtitle="Subscription, display, and account">
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel>
          <PanelTitle
            right={
              account ? (
                <Pill tone={account.status === "trial" ? "warn" : "go"}>
                  {account.status === "trial" ? `${trialDaysLeft} days left in trial` : "Active"}
                </Pill>
              ) : (
                <Pill tone="neutral">Signed out</Pill>
              )
            }
          >
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Subscription
            </span>
          </PanelTitle>

          {account ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card/60 p-3">
                  <Label>Account</Label>
                  <div className="font-display text-lg uppercase">{account.name}</div>
                  <p className="text-xs text-muted-foreground">{account.email}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-3">
                  <Label>Current plan</Label>
                  <div className="font-display text-lg uppercase">{current?.name}</div>
                  <p className="metric text-xs text-muted-foreground">
                    ${current?.price}
                    {current?.unit}
                    {account.plan === "fleet" ? ` · ${account.seats} trucks` : ""}
                  </p>
                </div>
              </div>

              <Label className="mt-4">Change plan</Label>
              <div className="mt-1 grid gap-2 sm:grid-cols-3">
                {plans.map((p) => {
                  const active = p.id === account.plan;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (active) return;
                        changePlan(p.id as PlanId);
                        toast.success(`Plan changed to ${p.name}`, {
                          description: "You approved this change.",
                        });
                      }}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        active
                          ? "border-primary/60 bg-primary/12"
                          : "border-border bg-card/50 hover:bg-accent",
                      )}
                    >
                      <div className="font-display text-sm uppercase tracking-[0.1em]">{p.name}</div>
                      <div className="metric mt-1 font-bold text-primary">
                        ${p.price}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {p.unit}
                        </span>
                      </div>
                      {active ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-go">
                          <Check className="h-3.5 w-3.5" /> Current
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <Label className="mt-4">In your plan</Label>
              <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                {current?.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-go" />
                    <span>{featureLabels[f]}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/pricing">Compare plans</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    signOut();
                    toast("Signed out");
                    void navigate({ to: "/sign-in" });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
              <div className="mt-3">
                <DriverApprovedNote>
                  Plan changes take effect only when you tap them. No auto-upgrades, no surprise
                  charges.
                </DriverApprovedNote>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You are signed out. Every tier includes a {TRIAL_DAYS}-day free trial.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="lg" asChild>
                  <Link to="/sign-up">Start free trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              </div>
            </>
          )}
        </Panel>


        <Panel>
          <PanelTitle right={<Pill tone="info">On by default</Pill>}>
            <span className="inline-flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-warn" /> Truck hazard layers
            </span>
          </PanelTitle>
          <HazardToggles />
          <p className="mt-3 text-xs text-muted-foreground">
            Every layer is on until you switch it off. Warnings are announced by voice and shown on
            the map well ahead of the hazard, factored for your height, weight, and length. They are
            information — what you do with them is your call.
          </p>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Applies app-wide</Pill>}>
            <span className="inline-flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> Display theme
            </span>
          </PanelTitle>
          <ThemePicker />
          <p className="mt-3 text-xs text-muted-foreground">
            Night is the default and stays genuinely dark for 3am running. Gray suits dusk and dawn.
            Day is high contrast for direct sun. The theme also switches from the orb screen.
          </p>

          <div className="mt-5 border-t border-border pt-4">
            <BrightnessPicker />
            <p className="mt-3 text-xs text-muted-foreground">
              The brightness step also lives one tap away on the voice bar and the orb screen, so
              you never have to dig through settings at 3am. HERCULES suggests a level — you decide.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function HazardToggles() {
  const { isOn, toggle, setAll } = useHazardLayers();
  return (
    <div className="space-y-2">
      {hazardKinds.map((k) => (
        <label
          key={k}
          className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-card/60 p-3"
        >
          <span className="min-w-0">
            <span className="block font-display uppercase tracking-wide">{hazardMeta[k].label}</span>
            <span className="block text-xs text-muted-foreground">{hazardMeta[k].blurb}</span>
          </span>
          <span
            role="switch"
            aria-checked={isOn(k)}
            aria-label={hazardMeta[k].label}
            onClick={() => toggle(k)}
            className={cn(
              "flex h-8 w-14 shrink-0 items-center rounded-full border-2 p-1 transition-colors",
              isOn(k) ? "border-primary bg-primary/30" : "border-border bg-muted",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-foreground transition-transform",
                isOn(k) ? "translate-x-6" : "translate-x-0",
              )}
            />
          </span>
        </label>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setAll(true)}>
          All on
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setAll(false)}>
          All off
        </Button>
      </div>
    </div>
  );
}
