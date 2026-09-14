import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building, Clock, MapPin, Plus, Send, Truck } from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  DriverApprovedNote,
  money,
  money2,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkProvider, useNetwork } from "@/lib/network";
import { RoleGate, ScopeStrip } from "@/components/network/RoleGate";
import { laneCandidates, loadStageLabel, loadStages, type PostedLoad } from "@/data/network";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/broker")({
  head: () => ({
    meta: [
      { title: "Broker Desk — HERCULES Network" },
      {
        name: "description",
        content:
          "Post and manage freight into the HERCULES network: rate, lane, equipment and windows, matched fleets and owner-operators, load tracking, and your own facility intelligence.",
      },
      { property: "og:title", content: "Broker Desk — HERCULES Network" },
      {
        property: "og:description",
        content: "Post freight, see who is matched on the lane, track it to delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrokerRoute,
});

function BrokerRoute() {
  return (
    <NetworkProvider>
      <AppShell title="Broker Desk" subtitle="Post freight into the HERCULES network and track it">
        <ScopeStrip />
        <RoleGate min="broker">
          <BrokerView />
        </RoleGate>
      </AppShell>
    </NetworkProvider>
  );
}

const equipmentOptions = [
  "Dry van 53'",
  "Flatbed, tarped",
  "Reefer",
  "Cargo van",
  "Car haul, 7-car",
  "Heavy haul, RGN",
  "Intermodal chassis",
] as const;

function stageTone(stage: PostedLoad["stage"]) {
  if (stage === "delivered") return "go" as const;
  if (stage === "posted") return "primary" as const;
  return "info" as const;
}

function BrokerView() {
  const { postings, postLoad, advanceStage, cancelPosting, facilities, addFacility } = useNetwork();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [miles, setMiles] = useState("");
  const [rate, setRate] = useState("");
  const [equipment, setEquipment] = useState<string>(equipmentOptions[0]);
  const [pickupWindow, setPickupWindow] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const [facName, setFacName] = useState("");
  const [facAddress, setFacAddress] = useState("");
  const [facHours, setFacHours] = useState("");
  const [facRole, setFacRole] = useState<"shipper" | "receiver">("shipper");
  const [facOpen24, setFacOpen24] = useState(false);
  const [facParking, setFacParking] = useState(false);
  const [facSpots, setFacSpots] = useState("");

  const live = postings.filter((p) => p.stage !== "delivered");
  const posted = postings.filter((p) => p.stage === "posted").length;
  const ratePerMile = postings.length
    ? postings.reduce((s, p) => s + p.rate / Math.max(1, p.miles), 0) / postings.length
    : 0;

  const ready =
    origin &&
    destination &&
    Number(miles) > 0 &&
    Number(rate) > 0 &&
    pickupWindow &&
    deliveryWindow;

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelTitle right={<Pill tone="primary">Open</Pill>}>On the board</PanelTitle>
          <Metric value={posted} unit="unclaimed" tone="primary" />
          <p className="mt-3 text-xs text-muted-foreground">
            Postings visible to every HERCULES fleet and owner-operator whose equipment matches.
          </p>
        </Panel>
        <Panel>
          <PanelTitle right={<Pill tone="info">Live</Pill>}>In motion</PanelTitle>
          <Metric value={live.length} unit="loads" tone="info" />
          <p className="mt-3 text-xs text-muted-foreground">
            Accepted through to delivery, tracked at each handover.
          </p>
        </Panel>
        <Panel>
          <PanelTitle right={<Pill tone="go">Average</Pill>}>Your rate</PanelTitle>
          <Metric value={money2(ratePerMile)} unit="/mi" tone="go" />
          <p className="mt-3 text-xs text-muted-foreground">
            Across everything you have on the board right now.
          </p>
        </Panel>
      </div>

      {/* POST FREIGHT */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="primary">Post freight</Pill>}>New load</PanelTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Origin</Label>
            <Input
              aria-label="Origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Dallas, TX"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Destination</Label>
            <Input
              aria-label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Kansas City, MO"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Miles</Label>
            <Input
              aria-label="Miles"
              inputMode="numeric"
              value={miles}
              onChange={(e) => setMiles(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="552"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Rate (USD)</Label>
            <Input
              aria-label="Rate"
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="1710"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Pickup window</Label>
            <Input
              aria-label="Pickup window"
              value={pickupWindow}
              onChange={(e) => setPickupWindow(e.target.value)}
              placeholder="Today 14:00–16:00"
              className="mt-1 h-12"
            />
          </div>
          <div>
            <Label>Delivery window</Label>
            <Input
              aria-label="Delivery window"
              value={deliveryWindow}
              onChange={(e) => setDeliveryWindow(e.target.value)}
              placeholder="Tomorrow 08:00–12:00"
              className="mt-1 h-12"
            />
          </div>
        </div>

        <Label className="mt-3">Equipment required</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {equipmentOptions.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={equipment === e}
              onClick={() => setEquipment(e)}
              className={cn(
                "bubble-tab min-h-[48px] normal-case tracking-[0.06em]",
                equipment === e && "bubble-tab-on",
              )}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Label>Notes for the driver</Label>
          <Input
            aria-label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tarps required. Receiver will not accept early."
            className="mt-1 h-12"
          />
        </div>

        <Button
          size="lg"
          className="mt-3 w-full gap-2"
          disabled={!ready}
          onClick={() => setPending(true)}
        >
          <Send className="h-4 w-4" /> Review and post
        </Button>
        <DriverApprovedNote>
          Posting puts the load in front of matching carriers. A driver still accepts it themselves
          — nothing is assigned to anyone.
        </DriverApprovedNote>
      </Panel>

      {/* WHO IS ON THE LANE */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="info">{laneCandidates.length} on lane</Pill>}>
          Matched and available capacity
        </PanelTitle>
        <div className="space-y-2">
          {laneCandidates.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-base uppercase tracking-[0.08em]">
                  <Truck className="h-4 w-4 text-primary" /> {c.name}
                </span>
                <div className="flex items-center gap-2">
                  <Pill tone="neutral">
                    {c.kind === "fleet" ? `${c.trucks} trucks` : "Owner-operator"}
                  </Pill>
                  <Pill
                    tone={
                      c.standing === "matched"
                        ? "go"
                        : c.standing === "available"
                          ? "primary"
                          : "neutral"
                    }
                  >
                    {c.standing}
                  </Pill>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.equipment.join(" · ")} · home lane {c.homeLane} · {c.onTimePct}% on time
              </p>
              <p className="mt-1 text-xs">{c.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* TRACKING */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="neutral">{postings.length} loads</Pill>}>
          Track your freight
        </PanelTitle>
        <div className="space-y-2">
          {postings.map((p) => {
            const idx = loadStages.indexOf(p.stage);
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-base uppercase tracking-[0.08em]">
                    {p.origin} → {p.destination}
                  </span>
                  <div className="flex items-center gap-2">
                    <Pill tone="neutral">{p.equipment}</Pill>
                    <Pill tone="go">{money(p.rate)}</Pill>
                    <Pill tone={stageTone(p.stage)}>{loadStageLabel[p.stage]}</Pill>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.id} · {p.miles} mi · {money2(p.rate / Math.max(1, p.miles))}/mi · posted{" "}
                  {p.postedAt}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pickup {p.pickupWindow} · Delivery {p.deliveryWindow}
                </p>
                {p.takenBy ? (
                  <p className="mt-1 text-xs">
                    Taken by <span className="text-primary">{p.takenBy.name}</span> · unit{" "}
                    {p.takenBy.unit}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Not claimed yet.</p>
                )}
                {p.notes ? <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p> : null}

                {/* stage trail */}
                <div className="mt-2 flex gap-1">
                  {loadStages.map((s, i) => (
                    <span
                      key={s}
                      title={loadStageLabel[s]}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        i <= idx ? "bg-primary" : "bg-border",
                      )}
                    />
                  ))}
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={p.stage === "delivered"}
                    onClick={() => {
                      advanceStage(p.id);
                      toast.success(`${p.id} moved on`, {
                        description: "Status updated for every party.",
                      });
                    }}
                  >
                    Advance status
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      cancelPosting(p.id);
                      toast.success(`${p.id} pulled off the board`);
                    }}
                  >
                    Pull from board
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* FACILITY INTELLIGENCE */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="info">{facilities.length} facilities</Pill>}>
          Your shippers and receivers
        </PanelTitle>
        <div className="space-y-2">
          {facilities.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-display text-base uppercase tracking-[0.08em]">
                  <Building className="h-4 w-4 text-primary" /> {f.name}
                </span>
                <div className="flex items-center gap-2">
                  <Pill tone="neutral">{f.role}</Pill>
                  <Pill tone={f.open24 ? "go" : "warn"}>{f.open24 ? "24 hours" : f.hours}</Pill>
                </div>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {f.address}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-info" />
                {f.overnightParking
                  ? `Overnight parking · ${f.spots} spots`
                  : "No overnight parking"}{" "}
                · {f.appointment ? "Appointment" : "First come"} · detention averages{" "}
                {f.avgDetentionMin} min
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{f.notes}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Label>Add a facility</Label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Facility name"
              value={facName}
              onChange={(e) => setFacName(e.target.value)}
              placeholder="Meridian DC 7 — Tulsa"
              className="h-12"
            />
            <Input
              aria-label="Facility address"
              value={facAddress}
              onChange={(e) => setFacAddress(e.target.value)}
              placeholder="900 N Mingo Rd, Tulsa, OK"
              className="h-12"
            />
            <Input
              aria-label="Facility hours"
              value={facHours}
              onChange={(e) => setFacHours(e.target.value)}
              placeholder="06:00–22:00"
              className="h-12"
            />
            <Input
              aria-label="Parking spots"
              inputMode="numeric"
              value={facSpots}
              onChange={(e) => setFacSpots(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="14"
              className="h-12"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["shipper", "receiver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={facRole === r}
                onClick={() => setFacRole(r)}
                className={cn(
                  "bubble-tab min-h-[48px] normal-case tracking-[0.06em] capitalize",
                  facRole === r
                    ? "border-primary/60 bg-primary/12 text-primary"
                    : "border-border bg-card/50",
                )}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={facOpen24}
              onClick={() => setFacOpen24((v) => !v)}
              className={cn(
                "min-h-[48px] rounded-lg border px-3 text-sm transition-colors",
                facOpen24 ? "border-go/60 bg-go/12 text-go" : "border-border bg-card/50",
              )}
            >
              Open 24 hours
            </button>
            <button
              type="button"
              aria-pressed={facParking}
              onClick={() => setFacParking((v) => !v)}
              className={cn(
                "min-h-[48px] rounded-lg border px-3 text-sm transition-colors",
                facParking ? "border-go/60 bg-go/12 text-go" : "border-border bg-card/50",
              )}
            >
              Overnight parking
            </button>
          </div>
          <Button
            size="lg"
            className="mt-2 w-full gap-2"
            disabled={!facName || !facAddress}
            onClick={() => {
              addFacility({
                name: facName,
                role: facRole,
                address: facAddress,
                hours: facOpen24 ? "24 hours" : facHours || "Hours not stated",
                open24: facOpen24,
                overnightParking: facParking,
                spots: facParking ? Number(facSpots || 0) : 0,
                appointment: true,
                avgDetentionMin: 0,
                notes: "Broker-supplied. Drivers see this before they arrive.",
              });
              toast.success(`${facName} added`, {
                description: "Hours, 24-hour status and parking go straight to the drivers.",
              });
              setFacName("");
              setFacAddress("");
              setFacHours("");
              setFacSpots("");
            }}
          >
            <Plus className="h-4 w-4" /> Add facility intelligence
          </Button>
        </div>
      </Panel>

      {/* EXPLICIT CONFIRMATION BEFORE POSTING */}
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Panel className="w-full max-w-md border-primary/45">
            <Label>Confirm posting</Label>
            <h2 className="mt-1 text-xl font-bold uppercase">
              {origin} → {destination}
            </h2>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                {equipment} · {miles} mi · {money(Number(rate))} (
                {money2(Number(rate) / Math.max(1, Number(miles)))}/mi)
              </p>
              <p className="text-muted-foreground">
                Pickup {pickupWindow} · Delivery {deliveryWindow}
              </p>
              {notes ? <p className="text-muted-foreground">{notes}</p> : null}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" size="lg" onClick={() => setPending(false)}>
                Cancel
              </Button>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => {
                  const created = postLoad({
                    origin,
                    destination,
                    miles: Number(miles),
                    rate: Number(rate),
                    equipment,
                    pickupWindow,
                    deliveryWindow,
                    ...(notes ? { notes } : {}),
                  });
                  toast.success(`${created.id} posted to the HERCULES network`, {
                    description: "Matching fleets and owner-operators can see it now.",
                  });
                  setPending(false);
                  setOrigin("");
                  setDestination("");
                  setMiles("");
                  setRate("");
                  setPickupWindow("");
                  setDeliveryWindow("");
                  setNotes("");
                }}
              >
                <Send className="h-4 w-4" /> Post it
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
