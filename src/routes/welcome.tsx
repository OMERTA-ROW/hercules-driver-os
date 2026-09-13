import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Check, Circle, Mic, Truck, UserCog } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Pill,
  Label,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useVehicle } from "@/lib/vehicles";
import { useVoice } from "@/lib/voice";
import { useMemberships } from "@/lib/company";
import { TRIAL_DAYS } from "@/data/plans";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Get Set Up — HERCULES" },
      {
        name: "description",
        content:
          "Three steps to start running with HERCULES: confirm your account, save the equipment you drive, and pick the voice that rides with you.",
      },
      { property: "og:title", content: "Get Set Up — HERCULES" },
      {
        property: "og:description",
        content: "Account, equipment, voice — then talk to the orb.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Step({
  n,
  title,
  done,
  icon: Icon,
  children,
  action,
}: {
  n: number;
  title: string;
  done: boolean;
  icon: typeof Truck;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <span
          className={
            done
              ? "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-go/50 bg-go/15 text-go"
              : "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/40 text-primary"
          }
        >
          {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base uppercase tracking-[0.14em]">
              {n}. {title}
            </span>
            {done ? (
              <Pill tone="go">Done</Pill>
            ) : (
              <Pill tone="warn">
                <Circle className="h-3 w-3" /> To do
              </Pill>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  const { account, trialDaysLeft, profileError } = useAuth();
  const { profiles, ready } = useVehicle();
  const { voice } = useVoice();
  const { active, pending } = useMemberships();

  const signedIn = !!account;
  const hasEquipment = ready && profiles.length > 0;
  const linked = active[0] ?? null;
  const awaiting = pending[0] ?? null;

  return (
    <AppShell
      title="Get set up"
      subtitle={
        signedIn
          ? `${account.name} · ${account.status === "trial" ? `${trialDaysLeft} of ${TRIAL_DAYS} trial days left` : "Active"}`
          : "Three short steps before your first run"
      }
    >
      <div className="mx-auto grid max-w-3xl gap-3">
        {profileError ? (
          <div className="rounded-lg border border-stop/40 bg-stop/10 p-3 text-sm">
            {profileError}
          </div>
        ) : null}

        <Panel>
          <PanelTitle right={<Pill tone="primary">Setup</Pill>}>Start here</PanelTitle>
          <div className="space-y-3">
            <Step n={1} title="Your account" done={signedIn} icon={UserCog}>
              {signedIn ? (
                <>
                  Signed in as {account.email}. Your {TRIAL_DAYS}-day trial is on your account — no
                  card was taken and nothing is charged.
                </>
              ) : (
                <>Create your account or sign in. Everything you save belongs to that account only.</>
              )}
              {!signedIn ? (
                <span className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="lg">
                    <Link to="/sign-up">Create account</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/sign-in">Sign in</Link>
                  </Button>
                </span>
              ) : null}
            </Step>

            <Step
              n={2}
              title="The equipment you drive"
              done={hasEquipment}
              icon={Truck}
              action={
                <Button asChild size="lg" variant={hasEquipment ? "outline" : "default"}>
                  <Link to="/equipment">
                    {hasEquipment ? "Review equipment" : "Add your equipment"}
                  </Link>
                </Button>
              }
            >
              Height, length, weight and axles decide which roads are legal for you and which
              clearance and hazard warnings you get. Save each unit you actually run — if you have
              more than one, I ask which you're in at the start of every trip.
            </Step>

            <Step
              n={3}
              title="Your company, if you run for one"
              done={!!linked}
              icon={Building2}
              action={
                <Button asChild size="lg" variant={linked ? "outline" : "default"}>
                  <Link to="/company">{linked ? "Company & dispatch" : "Connect or start a fleet"}</Link>
                </Button>
              }
            >
              {linked ? (
                <>Connected to {linked.company.name}. You see the loads and trucks that company shares with its members, and nothing from anyone else.</>
              ) : awaiting ? (
                <>You asked to join {awaiting.company.name}. Their dispatch appears once someone there approves you.</>
              ) : (
                <>
                  Company drivers and leased owner-operators join their carrier with the invite code
                  the carrier issues — codes expire and the carrier approves each person. Running your
                  own trucks? Create your fleet and invite your drivers. Skip this if you run alone.
                </>
              )}
            </Step>

            <Step
              n={4}
              title="Pick the voice that rides with you"
              done={true}
              icon={Mic}
              action={
                <Button asChild size="lg" variant="outline">
                  <Link to="/settings">Hear the voices</Link>
                </Button>
              }
            >
              You're set to {voice.name} right now. There are nine characters — five male, four
              female — and each one has a Listen button so you hear it before you choose. Your pick
              is remembered. If premium speech isn't available, your device speaks the line free
              instead.
            </Step>
          </div>
          <div className="mt-3">
            <DriverApprovedNote>
              I can propose and read anything aloud, but booking, spending or committing always waits
              for your explicit yes.
            </DriverApprovedNote>
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="go">Working today</Pill>}>What you can use now</PanelTitle>
          <ul className="space-y-1.5 text-sm">
            {[
              "Talk to the orb — your clock, loads, money, paperwork and road, read aloud",
              "Real maps with live traffic, satellite and street imagery, and a follow camera",
              "Your own hours, loads, trips, money and alerts — only what your account holds",
              "Truck stop and parking screens, breakdown assist, documents and compliance records",
              "Nine voices with previews, day/night brightness and full-size cab controls",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-go" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="warn">Not switched on yet</Pill>}>
            Straight talk about what isn't live
          </PanelTitle>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Label>Payments</Label> No card can be charged yet, so the store, document unlock, the
              Voice Hand-Off add-on and AI credit packs can't be bought. Prices are shown, nothing is
              billed and nothing unlocks itself.
            </li>
            <li>
              <Label>Truck-legal routing</Label> Routes and restrictions come from the map provider
              and from your own equipment profile. A commercial truck-routing service is not
              connected, so treat routes as guidance and keep your own eyes on posted signs.
            </li>
            <li>
              <Label>Engine telemetry</Label> Vehicle Health reads only what your account has
              recorded. No adapter is paired, so there is no live engine data or fault feed.
            </li>
            <li>
              <Label>Partner ordering</Label> Food, supply and parts ordering with outside platforms
              isn't connected, so orders can't be placed on your behalf.
            </li>
            <li>
              <Label>New account, empty screens</Label> Every screen shows only your own records. A
              blank clock or empty load board means nothing is logged yet — never invented numbers.
            </li>
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
