import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, Monitor, LogOut, Check, TriangleAlert, Volume2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { ThemePicker, BrightnessPicker } from "@/components/hercules/ThemeToggle";
import { Orb } from "@/components/hercules/Orb";
import { useVoice, orbColorways } from "@/lib/voice";
import { VoicePicker } from "@/components/hercules/VoicePicker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { plans, planById, featureLabels, TRIAL_DAYS, type PlanId } from "@/data/plans";
import { cn } from "@/lib/utils";
import { useHazardLayers } from "@/lib/hazard-layer";
import { useAddons } from "@/lib/addons";
import { feeBands, feeCategories } from "@/data/fees";
import { Layers, Receipt } from "lucide-react";
import { hazardKinds, hazardMeta } from "@/data/hazards";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Subscription — HERCULES" },
      {
        name: "description",
        content:
          "Manage your HERCULES subscription, matte colorway, voice, and display brightness.",
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
  const qc = useQueryClient();
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
                        "rounded-[1.75rem] border p-3 text-left transition-colors",
                        active
                          ? "border-primary/60 bg-primary/12"
                          : "border-border bg-card/50 hover:bg-accent",
                      )}
                    >
                      <div className="font-display text-sm uppercase tracking-[0.1em]">
                        {p.name}
                      </div>
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
                    void (async () => {
                      // Stop protected queries before the session goes, drop
                      // their cached data, then leave without a back-stack entry.
                      await qc.cancelQueries();
                      qc.clear();
                      await signOut();
                      toast("Signed out");
                      void navigate({ to: "/sign-in", replace: true });
                    })();
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

        <AddonsPanel />

        <FeePanel />

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
          <PanelTitle right={<Pill tone="primary">Applies app-wide</Pill>}>
            <span className="inline-flex items-center gap-2">
              <Circle className="h-5 w-5 text-primary" /> Matte colorway
            </span>
          </PanelTitle>
          <ColorwayGallery />
          <OrbPicker />
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Saved instantly</Pill>}>
            <span className="inline-flex items-center gap-2">
              <Waves className="h-5 w-5 text-primary" /> Motion
            </span>
          </PanelTitle>
          <MotionPicker />
          <p className="mt-3 text-xs text-muted-foreground">
            Choose Calm and every bubble lift, glow and screen transition stops, even if this device
            asks for full motion. Choose Full motion and it stays on even if the device asks for
            less. Your pick is kept for next time you start up.
          </p>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Hercules is default</Pill>}>
            <span className="inline-flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" /> Voice
            </span>
          </PanelTitle>
          <VoicePicker />
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Applies app-wide</Pill>}>
            <span className="inline-flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> Display exposure
            </span>
          </PanelTitle>
          <ThemePicker />
          <p className="mt-3 text-xs text-muted-foreground">
            Night stays dim for late running, Gray suits dusk and dawn, and Day raises contrast for
            direct sun. Your selected matte colorway remains active in every exposure.
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
            <span className="block font-display uppercase tracking-wide">
              {hazardMeta[k].label}
            </span>
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

/** App-wide matte colorway, previewed with the same responsive orb used on the road. */
function OrbPicker() {
  const { colorway, setColorway, mode } = useVoice();
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {orbColorways.map((o) => {
        const active = colorway === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setColorway(o.id)}
            aria-pressed={active}
            className={cn(
              "bubble-card flex flex-col items-center gap-3 p-4",
              active && "bubble-card-on",
            )}
          >
            <Orb className="w-24" mode={active ? mode : "idle"} colorway={o.id} />
            <span className="font-display text-sm font-light uppercase tracking-[0.18em]">
              {o.label}
            </span>
            <span className="text-center text-xs text-muted-foreground">{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/* The persona picker itself lives in components/hercules/VoicePicker.tsx. */

/**
 * ADD-ONS — stackable on top of the base plan, with the running monthly total
 * updating as the driver switches them on and off. New modules appear here
 * automatically from `src/data/addons.ts`.
 */
function AddonsPanel() {
  const { account } = useAuth();
  const { all, has, toggle, baseMonthly, addonMonthly, monthlyTotal } = useAddons();
  const monthly = all.filter((a) => a.billing === "monthly");
  const oneTime = all.filter((a) => a.billing === "one-time");

  return (
    <Panel>
      <PanelTitle right={<Pill tone="primary">${monthlyTotal.toFixed(2)} / month</Pill>}>
        <span className="inline-flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Add-ons
        </span>
      </PanelTitle>

      <div className="space-y-2">
        {monthly.map((a) => {
          const on = has(a.id);
          return (
            <div
              key={a.id}
              className={cn(
                "rounded-lg border p-3",
                on ? "border-primary/60 bg-primary/10" : "border-border bg-card/50",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-sm uppercase tracking-[0.1em]">{a.name}</div>
                  <p className="text-xs text-muted-foreground">{a.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="metric font-bold text-primary">${a.price.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.blurb}</p>
              {a.noPerOrderFee ? (
                <p className="mt-1 text-xs text-go">
                  No per-order fee — the app charges you, not HERCULES.
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  variant={on ? "outline" : "default"}
                  className="min-h-[56px]"
                  onClick={() => {
                    const outcome = toggle(a.id);
                    if (!outcome.ok) {
                      toast.error("Not added", { description: outcome.message });
                    }
                  }}
                >
                  {on ? "Switch it off" : `Add it — $${a.price.toFixed(2)} / month`}
                </Button>
                <Button size="lg" variant="outline" className="min-h-[56px]" asChild>
                  <Link to={a.href}>Open it</Link>
                </Button>
              </div>
            </div>
          );
        })}

        {oneTime.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-card/50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-sm uppercase tracking-[0.1em]">{a.name}</div>
                <p className="text-xs text-muted-foreground">{a.tagline}</p>
              </div>
              <div className="text-right">
                <div className="metric font-bold text-primary">${a.price.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">one time</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {has(a.id)
                ? "Bought and yours for good. Nothing recurring, ever."
                : "One-time unlock — not a subscription. It never touches your monthly total."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="lg" variant="outline" className="min-h-[56px]" asChild>
                <Link to={has(a.id) ? a.href : "/store"}>
                  {has(a.id) ? "Open it" : "See it in the Store"}
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card/50 p-3">
        <Label>AI assistance credits</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Billed separately from this subscription. Monthly credits expire at the end of each paid
          period; bought-once credits never do.
        </p>
        <Button size="lg" variant="outline" className="mt-3 min-h-[56px]" asChild>
          <Link to="/credits">Balance & credit packs</Link>
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-primary/40 bg-primary/8 p-3">
        <Label>What you pay every month</Label>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Base plan{account?.plan === "fleet" ? ` · ${account.seats} trucks` : ""}
            </span>
            <span className="metric">${baseMonthly.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Add-ons</span>
            <span className="metric">${addonMonthly.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-primary/25 pt-1 font-semibold text-primary">
            <span>Monthly total</span>
            <span className="metric">${monthlyTotal.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This updates the second you toggle an add-on. One-time unlocks are listed separately and
          never recur.
        </p>
      </div>
      <div className="mt-3">
        <DriverApprovedNote>
          Nothing is added or removed from your bill except by your own tap or your spoken yes.
        </DriverApprovedNote>
      </div>
    </Panel>
  );
}

/** Where a per-order HERCULES fee applies — and where it does not. */
function FeePanel() {
  return (
    <Panel>
      <PanelTitle right={<Pill tone="info">Always shown before you approve</Pill>}>
        <span className="inline-flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Per-order service fee
        </span>
      </PanelTitle>
      <p className="text-sm text-muted-foreground">
        HERCULES charges a service fee only where it actually places and pays the order for you. It
        scales with the size of the order and it is on screen and read aloud before you approve
        anything. It is what keeps HERCULES running.
      </p>
      <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        {feeCategories.map((c) => (
          <li key={c.id} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {c.label}
              <span className="block text-xs text-muted-foreground">{c.note}</span>
            </span>
          </li>
        ))}
      </ul>
      <Label className="mt-4">How it scales on a parts order</Label>
      <div className="mt-1 grid gap-1 sm:grid-cols-3">
        {feeBands.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-card/50 p-2">
            <div className="text-xs text-muted-foreground">{b.label}</div>
            <div className="metric font-bold text-primary">${b.fee.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-go">
        Food, grocery, retail and pharmacy delivery carry no HERCULES fee at all. Those platforms do
        not allow anyone else to place or process the order, so HERCULES hands it off pre-filled and
        the app charges you directly. The Voice Hand-Off Ordering add-on pays for that feature
        instead.
      </p>
    </Panel>
  );
}
