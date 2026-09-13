import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Plus, Trash2, Check, Volume2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  eighteenSubs,
  rulesFor,
  specFor,
  specKey,
  vehicleCatalog,
  type EighteenSub,
  type VehicleKind,
} from "@/data/vehicles";
import { hazardMeta } from "@/data/hazards";
import { useVehicle } from "@/lib/vehicles";
import { useAuth } from "@/lib/auth";
import { fleetTierSpec } from "@/data/accounts";
import { spokenAssignment } from "@/data/fleet-assignments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Profile — HERCULES Vehicle-Aware Routing" },
      {
        name: "description",
        content:
          "Save every piece of equipment you run — cargo van, flatbed, 18-wheeler, car haul, heavy haul — and HERCULES routes to what is legal for it, asking what you are in at the start of every trip.",
      },
      { property: "og:title", content: "Equipment Profile — HERCULES" },
      {
        property: "og:description",
        content:
          "The profile drives the route, so you never get sent where your equipment cannot legally or physically go.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentScreen,
});

function EquipmentScreen() {
  const {
    profiles,
    active,
    chooseForTrip,
    addProfile,
    removeProfile,
    resolution,
    assignment,
    fleetTier,
    loadError,
    saving,
    ready,
  } = useVehicle();
  const { account } = useAuth();
  const tier = fleetTier ? fleetTierSpec(fleetTier) : null;
  const [kind, setKind] = useState<VehicleKind>("eighteen");
  const [sub, setSub] = useState<EighteenSub>("dryVan");
  const [unit, setUnit] = useState("");

  const pickedSpec = specFor(kind, kind === "eighteen" ? sub : undefined);
  const pickedRules = rulesFor(pickedSpec);

  async function save() {
    const res = await addProfile(kind, kind === "eighteen" ? sub : undefined, unit);
    if (!res.ok) {
      toast.error("Not saved", { description: res.message });
      return;
    }
    setUnit("");
    toast.success(res.message, {
      description: "I will ask what you are in at the start of every trip.",
    });
  }

  /** One card per equipment family — 18-wheeler expands into its sub-options. */
  const families = [
    { kind: "cargoVan" as VehicleKind, label: "Cargo van / Sprinter" },
    { kind: "flatbed" as VehicleKind, label: "Flatbed" },
    { kind: "eighteen" as VehicleKind, label: "18-wheeler" },
    { kind: "carHaul" as VehicleKind, label: "Car haul" },
    { kind: "heavyHaul" as VehicleKind, label: "Heavy haul" },
  ];

  return (
    <AppShell
      title="Equipment"
      subtitle="The profile drives the route — not the other way around"
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {/* SAVED EQUIPMENT */}
        <Panel>
          <PanelTitle right={<Pill tone="primary">{profiles.length} saved</Pill>}>
            What you run
          </PanelTitle>
          {!account ? (
            <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
              You're not signed in, so nothing can be saved to an account.{" "}
              <Link to="/sign-in" className="text-primary underline">
                Sign in
              </Link>{" "}
              and your equipment stays with you.
            </div>
          ) : loadError ? (
            <div className="mb-3 rounded-lg border border-stop/40 bg-stop/10 p-3 text-sm">
              {loadError}
            </div>
          ) : ready && profiles.length === 0 ? (
            <div className="mb-3 rounded-lg border border-info/35 bg-info/10 p-3 text-sm">
              Nothing saved yet. Add the truck and trailer you actually run — routing, clearances and
              hazard warnings all read from it.
            </div>
          ) : null}
          <div className="space-y-2">
            {profiles.map((p) => {
              const rules = rulesFor(p);
              const isActive = p.id === active.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-xl border p-3",
                    isActive ? "border-primary/60 bg-primary/10" : "border-border bg-card/60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base uppercase tracking-[0.1em]">
                        {p.label}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.unit} · {p.heightFt}' tall · {p.lengthFt}' long ·{" "}
                        {p.grossWeightLbs.toLocaleString()} lb · {p.axles} axles
                      </p>
                      <p className="mt-1 text-xs">
                        {rules.backRoadsAllowed ? (
                          <span className="text-go">
                            County roads and back roads permitted — shortest legal line
                          </span>
                        ) : (
                          <span className="text-warn">
                            Interstate and legal county highway only — nothing illegal for the
                            equipment
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {isActive ? (
                        <Pill tone="go">
                          <Check className="h-3.5 w-3.5" /> In it today
                        </Pill>
                      ) : resolution === "inherited" ? (
                        <Pill tone="info">Company assigns</Pill>
                      ) : (
                        <Button size="lg" onClick={() => chooseForTrip(p.id)}>
                          Use for this trip
                        </Button>
                      )}
                      {profiles.length > 1 ? (
                        <Button
                          size="lg"
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            void removeProfile(p.id).then((r) =>
                              r.ok
                                ? toast.success(r.message)
                                : toast.error("Not removed", { description: r.message }),
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* HOW THE PROFILE IS RESOLVED — asked out loud, or inherited from the fleet */}
          {resolution === "inherited" && assignment ? (
            <div className="mt-3 rounded-lg border border-go/35 bg-go/10 p-2.5">
              <Label>Assigned by your company</Label>
              <p className="mt-1 text-xs">
                {spokenAssignment(assignment)}. {tier ? `${tier.label} · ${tier.range} — ` : ""}I do
                not ask what you are in: the fleet's truck and trailer assignment sets your routing
                rules and hazard checks automatically.
              </p>
            </div>
          ) : profiles.length > 1 ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-info/35 bg-info/10 p-2.5 text-xs">
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-info" /> You run more than one, so at
              the start of every trip I ask out loud: “What are you in today?” Whatever you answer is
              what I route for.
            </p>
          ) : null}
          <div className="mt-3">
            <DriverApprovedNote>
              Nothing on this profile changes unless you change it.
            </DriverApprovedNote>
          </div>
        </Panel>

        {/* ADD EQUIPMENT */}
        <Panel>
          <PanelTitle right={<Pill tone="info">Setup</Pill>}>Add equipment</PanelTitle>
          <Label>Equipment type</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {families.map((f) => (
              <button
                key={f.kind}
                type="button"
                aria-pressed={kind === f.kind}
                onClick={() => setKind(f.kind)}
                className={cn(
                  "min-h-[64px] rounded-lg border p-3 text-left font-display text-sm uppercase tracking-[0.12em] transition-colors",
                  kind === f.kind
                    ? "border-primary/60 bg-primary/12 text-primary"
                    : "border-border bg-card/50 hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {kind === "eighteen" ? (
            <>
              <Label className="mt-3 block">Operation</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {eighteenSubs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sub === s.id}
                    onClick={() => setSub(s.id)}
                    className={cn(
                      "min-h-[60px] rounded-lg border p-2.5 text-left transition-colors",
                      sub === s.id
                        ? "border-primary/60 bg-primary/12"
                        : "border-border bg-card/50 hover:bg-accent",
                    )}
                  >
                    <span className="block font-display text-sm uppercase tracking-[0.12em]">
                      {s.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <Label className="mt-3 block">Your name for it</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            aria-label="Unit name"
            placeholder="Unit 4471 / the Pete"
            className="mt-1 h-12 text-base"
          />

          {/* What this pick means for routing — stated before it is saved */}
          <div className="mt-3 rounded-lg border border-primary/25 bg-primary/8 p-3">
            <Label>How I route for it</Label>
            <p className="mt-1 text-sm">{pickedRules.spoken}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {pickedSpec.heightFt}' tall · needs {pickedSpec.minClearanceFt}' posted clearance ·{" "}
              {pickedSpec.lengthFt}' long · {pickedSpec.grossWeightLbs.toLocaleString()} lb
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pickedRules.hazardKinds.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-primary/30 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-primary/90"
                >
                  {hazardMeta[k].short}
                </span>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="mt-3 w-full gap-2"
            disabled={saving}
            onClick={() => void save()}
          >
            <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Save this equipment"}
          </Button>

          <Button variant="outline" size="lg" className="mt-2 w-full gap-2" asChild>
            <Link to="/navigation">
              <ShieldCheck className="h-4 w-4" /> See the route it produces
            </Link>
          </Button>
        </Panel>
      </div>

      {/* THE FULL RULE SET — plain language, per equipment type */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="go">Legal by equipment</Pill>}>
          What each profile is allowed on
        </PanelTitle>
        <div className="grid gap-2 lg:grid-cols-2">
          {vehicleCatalog.map((spec) => {
            const rules = rulesFor(spec);
            return (
              <div
                key={specKey(spec.kind, spec.sub)}
                className="rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm uppercase tracking-[0.12em]">
                    {spec.label}
                  </span>
                  <Pill tone={rules.backRoadsAllowed ? "go" : "warn"}>
                    {rules.backRoadsAllowed ? "Back roads OK" : "Truck roads only"}
                  </Pill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{rules.spoken}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Low bridge clearance checks run on every trailer profile, line haul and intermodal
          included. Heavy haul adds steep grade, switchback and posted weight-limit checks on top.
        </p>
      </Panel>
    </AppShell>
  );
}
