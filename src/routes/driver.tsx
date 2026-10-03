import { createFileRoute, Link } from "@tanstack/react-router";
import { UserCog, Truck, Mic } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  Metric,
  EmptyState,
  DriverApprovedNote,
  hm,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useHours, useMileage, useVehicles } from "@/lib/live";
import { voiceCommands } from "@/data/voice-commands";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver Profile — HERCULES" },
      {
        name: "description",
        content:
          "Your account, your equipment, your logged hours and miles — and everything you can say to HERCULES out loud.",
      },
      { property: "og:title", content: "Driver Profile — HERCULES" },
      {
        property: "og:description",
        content: "Account, equipment, hours, and the full voice phrasebook.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Driver,
});

function Driver() {
  const { account, kind, trialDaysLeft } = useAuth();
  const { data: vehicles } = useVehicles();
  const { hours } = useHours();
  const miles = useMileage();
  const rigs = vehicles ?? [];

  return (
    <AppShell title="Driver" subtitle={account?.email ?? "Not signed in"}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelTitle
            right={
              account?.status === "trial" ? (
                <Pill tone="warn">Trial · {trialDaysLeft} days</Pill>
              ) : (
                <Pill tone="go">Active</Pill>
              )
            }
          >
            Account
          </PanelTitle>
          {!account ? (
            <EmptyState
              title="Not signed in"
              action={
                <Button asChild size="lg">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
              }
            >
              Your hours, equipment, and history live on your own account.
            </EmptyState>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-display uppercase tracking-[0.1em]">{account.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Door</dt>
                <dd className="font-display uppercase tracking-[0.1em]">{kind}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-display uppercase tracking-[0.1em]">{account.plan}</dd>
              </div>
              {account.company ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Carrier</dt>
                  <dd className="font-display uppercase tracking-[0.1em]">
                    {account.company.name} · {account.company.code}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </Panel>

        <Panel>
          <PanelTitle
            right={
              <Pill tone="primary">
                <UserCog className="h-3.5 w-3.5" /> Logged
              </Pill>
            }
          >
            Hours and miles
          </PanelTitle>
          {hours ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Drive left today</Label>
                <Metric value={hm(hours.driveRemainingMin)} tone="primary" />
              </div>
              <div>
                <Label>On duty left</Label>
                <Metric value={hm(hours.onDutyRemainingMin)} />
              </div>
              <div>
                <Label>Cycle left</Label>
                <Metric value={hours.cycleRemainingHrs.toFixed(1)} unit="hrs" />
              </div>
              <div>
                <Label>Miles this week</Label>
                <Metric value={miles.week.toLocaleString()} unit="mi" />
              </div>
            </div>
          ) : (
            <EmptyState title="No hours logged">
              Start a trip and HERCULES tracks drive, on-duty, and cycle time from your own records.
              It will not show a clock it cannot back up.
            </EmptyState>
          )}
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="neutral">{rigs.length} on file</Pill>}>
            Your equipment
          </PanelTitle>
          {rigs.length === 0 ? (
            <EmptyState
              title="No vehicle on file"
              action={
                <Button asChild size="lg" className="gap-2">
                  <Link to="/equipment">
                    <Truck className="h-4 w-4" /> Add your equipment
                  </Link>
                </Button>
              }
            >
              Routing, clearances, and hazard warnings all come from your equipment profile.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {rigs.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div>
                    <div className="font-display text-sm uppercase tracking-[0.1em]">
                      {v.label}
                      {v.unit_number ? ` · ${v.unit_number}` : ""}
                    </div>
                    <Label>
                      {v.equipment_type}
                      {v.gross_weight_lb ? ` · ${v.gross_weight_lb.toLocaleString()} lbs` : ""}
                      {v.height_inches ? ` · ${(v.height_inches / 12).toFixed(1)} ft tall` : ""}
                    </Label>
                  </div>
                  {v.active ? <Pill tone="go">Active</Pill> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelTitle
            right={
              <Pill tone="primary">
                <Mic className="h-3.5 w-3.5" /> Voice
              </Pill>
            }
          >
            What you can say
          </PanelTitle>
          <ul className="space-y-2">
            {voiceCommands.map((c) => (
              <li key={c.phrase} className="rounded-lg border border-border bg-card/50 p-2.5">
                <div className="font-display text-sm uppercase tracking-[0.08em] text-primary">
                  “{c.phrase}”
                </div>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <DriverApprovedNote />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
