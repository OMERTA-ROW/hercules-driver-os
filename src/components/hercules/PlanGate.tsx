import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { featureLabels, plans, type Feature } from "@/data/plans";
import { Button } from "@/components/ui/button";
import { Panel, Label, DriverApprovedNote } from "./primitives";

/** Renders children when the account's tier includes the feature; otherwise a plain upgrade notice. */
export function PlanGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { account, ready, can } = useAuth();

  if (!ready) return null;

  if (!account) {
    return (
      <Panel className="max-w-2xl">
        <Label>Sign in required</Label>
        <h2 className="mt-1 text-2xl font-bold uppercase">This needs an account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to use HERCULES. Every tier starts with a 7-day free trial.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/pricing">See plans</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  if (can(feature)) return <>{children}</>;

  const needed = plans.find((p) => p.features.includes(feature));

  return (
    <Panel className="max-w-2xl">
      <Label>Not in your plan</Label>
      <div className="mt-1 flex items-center gap-2">
        <Lock className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold uppercase">{featureLabels[feature]}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        You are on <span className="text-foreground">{planById(account.plan).name}</span>. This is
        included in <span className="text-foreground">{needed?.name ?? "a higher tier"}</span> at $
        {needed?.price}
        {needed?.unit}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="lg" asChild>
          <Link to="/pricing">Compare plans</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/settings">Subscription settings</Link>
        </Button>
      </div>
      <div className="mt-3">
        <DriverApprovedNote>
          Nothing changes on your account until you confirm it yourself.
        </DriverApprovedNote>
      </div>
    </Panel>
  );
}
