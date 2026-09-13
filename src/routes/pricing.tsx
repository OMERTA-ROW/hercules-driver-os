import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, X, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, Label, Pill, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { plans, featureLabels, TRIAL_DAYS, type Feature } from "@/data/plans";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Plans & Pricing — HERCULES" },
      {
        name: "description",
        content:
          "Company Driver $5/mo, Owner-Operator $29/mo, Fleet $19 per truck per month (3 truck minimum). Every tier starts with a 7-day free trial.",
      },
      { property: "og:title", content: "Plans & Pricing — HERCULES" },
      {
        property: "og:description",
        content: "Three tiers. No free plan. 7-day free trial on every one of them.",
      },
    ],
  }),
  component: Pricing,
});

const allFeatures: Feature[] = [
  "dashboard",
  "health",
  "alerts",
  "driver",
  "voice",
  "loads",
  "financials",
  "loadReset",
  "fleet",
];

function Pricing() {
  const { account, changePlan } = useAuth();
  const navigate = useNavigate();

  function choose(planId: (typeof plans)[number]["id"], name: string) {
    if (!account) {
      void navigate({ to: "/sign-up" });
      return;
    }
    changePlan(planId);
    toast.success(`Plan set to ${name}`, {
      description: "You approved this change. Nothing else was altered.",
    });
  }

  return (
    <AppShell title="Plans" subtitle="No free tier. A 7-day free trial on every plan.">
      <div className="grid gap-3 lg:grid-cols-3">
        {plans.map((p) => {
          const current = account?.plan === p.id;
          return (
            <Panel key={p.id} className={current ? "glow-ring" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold uppercase">{p.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{p.who}</p>
                </div>
                {current ? <Pill tone="primary">Your plan</Pill> : null}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="metric text-5xl font-bold text-primary">${p.price}</span>
                <span className="label-cap">{p.unit}</span>
              </div>
              {p.minSeats ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {p.minSeats} truck minimum — ${p.price * p.minSeats}
                  /month at 3 trucks
                </p>
              ) : null}

              <ul className="mt-4 space-y-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-go" />
                    <span>{featureLabels[f]}</span>
                  </li>
                ))}
                {p.excluded.map((e) => (
                  <li key={e} className="flex gap-2 text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant={p.id === "owner" ? "default" : "outline"}
                className="mt-4 w-full"
                onClick={() => choose(p.id, p.name)}
                disabled={current}
              >
                {current ? "Current plan" : `Start ${TRIAL_DAYS}-day free trial`}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Card required after the trial. Cancel any time before it ends and you pay nothing.
              </p>
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-3 overflow-x-auto">
        <Label className="mb-3">What each tier actually gets you</Label>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 font-display uppercase tracking-[0.12em]">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="py-2 text-center font-display uppercase tracking-[0.12em]">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFeatures.map((f) => (
              <tr key={f} className="border-b border-border/60">
                <td className="py-2 pr-3">{featureLabels[f]}</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-2 text-center">
                    {p.features.includes(f) ? (
                      <Check className="mx-auto h-4 w-4 text-go" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <DriverApprovedNote>
            No auto-upgrades, no silent plan changes. You pick the tier, you confirm it.
          </DriverApprovedNote>
        </div>
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/8 p-3">
          <Label>AI assistance credits — separate from your plan</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Spoken AI answers run on credits: a monthly allowance, or buy-once packs that never expire. Your
            app plan above is unchanged either way, and every action's cost is shown before you use it.
          </p>
          <Button size="lg" variant="outline" className="mt-3" asChild>
            <Link to="/credits">See AI credits</Link>
          </Button>
        </div>
        {!account ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="lg" asChild>
              <Link to="/sign-up">Create account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/sign-in">I already have one</Link>
            </Button>
          </div>
        ) : null}
      </Panel>
    </AppShell>
  );
}
