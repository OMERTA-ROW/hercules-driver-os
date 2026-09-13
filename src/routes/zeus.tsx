import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Copy, UserPlus, Truck, ShieldCheck, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  doorFor,
  fleetTierSpec,
  fleetTiers,
  tierForTrucks,
} from "@/data/accounts";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";
import { vehicleCatalog } from "@/data/vehicles";

export const Route = createFileRoute("/zeus")({
  head: () => ({
    meta: [
      { title: "ZEUS Fleet — Onboard Your Carrier and Your Drivers" },
      {
        name: "description",
        content:
          "ZEUS is the company side of the same system HERCULES drivers run. Onboard your fleet, issue a company code, and link your drivers into rotation.",
      },
      { property: "og:title", content: "ZEUS Fleet — Onboard Your Carrier" },
      {
        property: "og:description",
        content:
          "An open platform: any carrier can onboard its own trucks and drivers, with fleet-scoped permissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ZeusOnboarding,
});

function ZeusOnboarding() {
  const { account, signUp } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trucks, setTrucks] = useState(3);

  const door = doorFor("zeusFleet");
  /* The stated truck count becomes the tier, and the tier decides whether
     HERCULES asks each driver what they are in or inherits it from the fleet. */
  const tier = fleetTierSpec(tierForTrucks(trucks));
  const onboarded = account?.kind === "zeusFleet" ? account : null;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-3xl font-bold uppercase tracking-[0.14em] text-primary"
          >
            ZE<span className="text-foreground">US</span>
          </Link>
          <ThemeToggle size="sm" />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelTitle right={<Pill tone="info">Company side</Pill>}>
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Onboard your fleet
              </span>
            </PanelTitle>
            <p className="text-sm text-muted-foreground">{door.who}</p>

            {onboarded?.company ? (
              <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
                <Label>Your company code</Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="metric text-2xl font-bold text-primary">
                    {onboarded.company.code}
                  </span>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(onboarded.company!.code);
                      toast.success("Code copied — hand it to your drivers");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {onboarded.company.name} · {onboarded.seats} trucks in rotation. A driver enters
                  this code on the HERCULES Company Driver door and they are linked to your fleet.
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-primary">
                    {fleetTierSpec(onboarded.fleetTier ?? tierForTrucks(onboarded.seats)).label} ·{" "}
                    {fleetTierSpec(onboarded.fleetTier ?? tierForTrucks(onboarded.seats)).range}
                  </span>{" "}
                  — {fleetTierSpec(onboarded.fleetTier ?? tierForTrucks(onboarded.seats)).resolution}
                </p>
                <Button size="lg" className="mt-3 w-full gap-2" asChild>
                  <Link to="/fleet">
                    <Truck className="h-4 w-4" /> Open the fleet board
                  </Link>
                </Button>
              </div>
            ) : (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!company || !email || !password) {
                    toast.error("Enter your carrier name, email, and a password");
                    return;
                  }
                  void (async () => {
                    const { error, needsConfirmation } = await signUp({
                      name: company,
                      email,
                      password,
                      plan: "fleet",
                      seats: Math.max(3, trucks),
                      kind: "zeusFleet",
                      companyName: company,
                    });
                    if (error) {
                      toast.error("Could not onboard the fleet", { description: error });
                      return;
                    }
                    if (needsConfirmation) {
                      toast.success("Check your email to confirm", {
                        description: "Confirm the link we sent, then sign in on the ZEUS door.",
                      });
                      return;
                    }
                    toast.success("Fleet onboarded on ZEUS", {
                      description: "Your company code is ready to hand to your drivers.",
                    });
                  })();
                }}
              >
                <div>
                  <Label>Carrier name</Label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    aria-label="Carrier name"
                    placeholder="Bass Transport LLC"
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div>
                  <Label>Operations email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Operations email"
                    placeholder="dispatch@carrier.com"
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Password"
                    placeholder="••••••••"
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div>
                  <Label>How many trucks do you run?</Label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    {fleetTiers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={tier.id === t.id}
                        onClick={() => setTrucks(t.id === "tier1" ? 3 : t.id === "tier2" ? 25 : 120)}
                        className={cn(
                          "min-h-[76px] rounded-lg border p-3 text-left transition-colors",
                          tier.id === t.id
                            ? "border-primary/60 bg-primary/12 text-primary"
                            : "border-border bg-card/50 hover:bg-accent",
                        )}
                      >
                        <span className="block font-display text-sm uppercase tracking-[0.12em]">
                          {t.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">{t.range}</span>
                      </button>
                    ))}
                  </div>
                  <Label className="mt-3 block">Exact truck count (minimum 3)</Label>
                  <Input
                    type="number"
                    min={3}
                    value={trucks}
                    aria-label="Trucks"
                    onChange={(e) => setTrucks(Math.max(3, Number(e.target.value) || 3))}
                    className="mt-1 h-12 text-base"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Recorded as <span className="text-primary">{tier.label} · {tier.range}</span>.
                    No ceiling at any tier — a hundred-plus truck carrier onboards every driver it
                    has.
                  </p>
                  <p className="mt-1 flex items-start gap-2 text-xs">
                    <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {tier.resolution}
                  </p>
                </div>
                <Button type="submit" size="lg" className="w-full gap-2">
                  <UserPlus className="h-4 w-4" /> Onboard this carrier
                </Button>
                <p className="text-xs text-muted-foreground">{door.price}</p>
              </form>
            )}
            <div className="mt-3">
              <DriverApprovedNote>
                Drivers keep the final say in the cab. ZEUS sets the rotation; it does not drive the
                truck.
              </DriverApprovedNote>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel>
              <PanelTitle right={<Pill tone="go">Fleet scope</Pill>}>
                What the company side can reach
              </PanelTitle>
              <ul className="space-y-1.5 text-sm">
                {door.scopes.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-go" /> {scopeLabel(s)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                A company driver's own door stays narrower: their truck and their documents, plus a
                link to the carrier. Their money and their load booking are not exposed to it.
              </p>
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="info">Open platform</Pill>}>
                Your fleet, your roster
              </PanelTitle>
              <p className="text-sm text-muted-foreground">
                Carriers are not listed publicly here. Create your company, then invite your drivers
                and leased operators with expiring codes and approve each one yourself. Nobody sees
                another company's people, trucks or loads.
              </p>
              <Button size="lg" className="mt-3 w-full" asChild>
                <Link to="/company">Company &amp; dispatch</Link>
              </Button>
              <Button variant="outline" size="lg" className="mt-2 w-full" asChild>
                <Link to="/sign-in">Driver sign-in instead</Link>
              </Button>
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="primary">Equipment</Pill>}>
                Equipment your drivers can be routed for
              </PanelTitle>
              <div className="flex flex-wrap gap-1.5">
                {vehicleCatalog.map((v) => (
                  <span
                    key={v.label}
                    className="rounded-full border border-primary/30 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-primary/90"
                  >
                    {v.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Every driver's saved equipment drives their own routing. A van gets back roads; a
                trailer never gets a road that isn't legal for it.
              </p>
            </Panel>

            <Panel>
              <PanelTitle right={<Pill tone="info">Fleet size</Pill>}>
                Tiers and the per-trip question
              </PanelTitle>
              <div className="space-y-2">
                {fleetTiers.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-card/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm uppercase tracking-[0.12em]">
                        {t.label} · {t.range}
                      </span>
                      <Pill tone={t.asksPerTrip ? "primary" : "go"}>
                        {t.asksPerTrip ? "Driver is asked" : "Inherited silently"}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.who}</p>
                    <p className="mt-1 text-xs">{t.resolution}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Tier 3 is open ended. A hundred-plus truck carrier onboards every driver and every
                unit it runs — there is no ceiling on the company side.
              </p>
            </Panel>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="lg" onClick={() => void navigate({ to: "/" })}>
            Back to the orb
          </Button>
        </div>
      </div>
    </main>
  );
}

function scopeLabel(scope: string) {
  switch (scope) {
    case "self.truck":
      return "Truck health and diagnostics";
    case "self.money":
      return "Settlements, fuel and IFTA";
    case "self.loads":
      return "Load board and booking";
    case "self.documents":
      return "Document capture and send";
    case "fleet.trucks":
      return "Every truck in the fleet";
    case "fleet.drivers":
      return "Driver records and rotation";
    case "fleet.onboarding":
      return "Onboard drivers by invite or company code";
    case "fleet.billing":
      return "Per-truck billing for the carrier";
    case "company.linked":
      return "Linked to a carrier as a company driver";
    default:
      return scope;
  }
}
