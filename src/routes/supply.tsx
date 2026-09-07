import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mic,
  MapPin,
  ShoppingBasket,
  Star,
  TriangleAlert,
  Check,
  X,
  Clock,
} from "lucide-react";
import { useArrivals } from "@/lib/arrivals";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Pill,
  DriverApprovedNote,
  money2,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  categoryLabels,
  coveragePoints,
  serviceOf,
  services,
  type OrderOption,
  type ServiceCategory,
} from "@/data/delivery";
import { meetPresets } from "@/data/delivery";
import { useDelivery } from "@/lib/delivery";

export const Route = createFileRoute("/supply")({
  head: () => ({
    meta: [
      { title: "Delivery & Supply — HERCULES" },
      {
        name: "description",
        content:
          "Order food, groceries and essentials to the truck by voice. HERCULES checks Uber Eats, DoorDash, Grubhub, Instacart, GoPuff, Walmart, Walgreens, CVS and Amazon coverage where you are parked before you try to order.",
      },
      { property: "og:title", content: "Delivery & Supply — HERCULES" },
      {
        property: "og:description",
        content:
          "Voice-ordered delivery to the dock, the lot or the rest area — with a clear coverage notice for every service and nothing placed without your word.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplyScreen,
});

const categories: ServiceCategory[] = ["food", "grocery", "retail", "pharmacy"];

function ServiceBadge({ id }: { id: (typeof services)[number]["id"] }) {
  const s = serviceOf(id);
  return (
    <span
      className="flex h-9 w-12 shrink-0 items-center justify-center rounded font-display text-[0.7rem] font-semibold tracking-[0.1em]"
      style={{ backgroundColor: s.fill, color: s.text }}
    >
      {s.short}
    </span>
  );
}

function SupplyScreen() {
  const {
    location,
    coverageFor,
    spoken,
    noFoodHere,
    nearestCoveredAhead,
    options,
    favorites,
    meetNote,
    setMeetNote,
    orders,
    place,
    cancel,
    provider,
  } = useDelivery();

  const [spokenLine, setSpokenLine] = useState<string | null>(null);
  const [pending, setPending] = useState<OrderOption | null>(null);

  /** Only options whose service can actually reach the truck right now. */
  const reachable = useMemo(
    () => options.filter((o) => coverageFor(o.service).status !== "none"),
    [options, coverageFor],
  );
  const blocked = useMemo(
    () => options.filter((o) => coverageFor(o.service).status === "none"),
    [options, coverageFor],
  );

  function voiceOrder() {
    const first = reachable[0];
    setSpokenLine(
      first
        ? `You are at ${location.label}. ${noFoodHere ? "No restaurant delivery reaches this lot at all." : ""} Best I can actually get to you is ${serviceOf(first.service).name} — ${first.vendor}, ${first.summary}. ${money2(first.subtotal)} plus ${money2(first.deliveryFee)} delivery, ${money2(first.subtotal + first.deliveryFee)} total, about ${first.etaMin} minutes to ${meetNote || "the truck"}. Say "order it" and I will read it back once more before anything is placed.`
        : `Nothing can reach you at ${location.label}. ${nearestCoveredAhead ? `${nearestCoveredAhead.label}, ${nearestCoveredAhead.milesAhead} miles ahead, has coverage — eat there before you shut down.` : ""}`,
    );
  }

  function reorder(favId: string) {
    const fav = favorites.find((f) => f.id === favId);
    if (!fav) return;
    const cov = coverageFor(fav.service);
    if (cov.status === "none") {
      setSpokenLine(
        `${fav.label} runs on ${serviceOf(fav.service).name}, and there is no ${serviceOf(fav.service).name} available in this area. ${nearestCoveredAhead ? `It works again at ${nearestCoveredAhead.label}, ${nearestCoveredAhead.milesAhead} miles ahead.` : ""}`,
      );
      return;
    }
    const opt = options.find((o) => o.service === fav.service) ?? options[0];
    if (!opt) return;
    setSpokenLine(
      `Reordering ${fav.label} from ${fav.vendor} on ${serviceOf(fav.service).name}. Last time it came to ${money2(fav.lastTotal)}. Nothing is placed yet — approve it below or say yes.`,
    );
    setPending({ ...opt, vendor: fav.vendor, items: fav.items, summary: fav.label });
  }

  async function confirm() {
    if (!pending) return;
    const order = await place(pending);
    // INBOUND ARRIVAL: HERCULES now tracks the courier and calls out the
    // countdown by name, unprompted, so the driver can rest until they're here.
    expectDelivery({
      service: order.service,
      vendor: order.vendor,
      etaMin: order.etaMin,
      summary: pending.summary,
    });
    setPending(null);
    setSpokenLine(
      `Placed on your word. ${serviceOf(order.service).name} — ${order.vendor}, ${money2(order.total)} total, about ${order.etaMin} minutes to ${order.dropLabel}. Meet note: ${order.meetNote}. You can cancel it from this screen.`,
    );
  }

  return (
    <AppShell
      title="Delivery & Supply"
      subtitle="Food, groceries and essentials brought to the truck — coverage checked where you sit"
    >
      {/* WHERE THE TRUCK IS + coverage headline. Proactive, before any ordering. */}
      <Panel
        className={
          noFoodHere ? "mb-3 border-warn/50 bg-warn/8" : "mb-3 border-primary/40 bg-primary/6"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {noFoodHere ? (
              <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0 text-warn" />
            ) : (
              <MapPin className="mt-0.5 h-7 w-7 shrink-0 text-primary" />
            )}
            <div>
              <Label>Delivering to your position</Label>
              <div className="mt-1 text-lg font-semibold uppercase tracking-wide">
                {location.label}
              </div>
              <p className="text-sm text-muted-foreground">{location.detail}</p>
              <p
                className={`mt-2 max-w-3xl text-sm ${noFoodHere ? "text-warn" : "text-muted-foreground"}`}
              >
                {noFoodHere
                  ? "No restaurant delivery covers this lot. Grab food before you park up, or use what can still reach you below."
                  : "Restaurant delivery reaches this spot."}
                {nearestCoveredAhead && noFoodHere
                  ? ` Nearest coverage on your route: ${nearestCoveredAhead.label}, ${nearestCoveredAhead.milesAhead} miles ahead.`
                  : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={voiceOrder}
            className="min-h-[56px] gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Mic className="h-5 w-5" />
            “Order me food here”
          </Button>
        </div>
        {spokenLine ? (
          <p className="mt-3 border-t border-primary/20 pt-3 text-sm leading-relaxed text-foreground/85">
            <span className="tech-label mr-2 text-primary">Hercules</span>
            {spokenLine}
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-3 xl:grid-cols-3">
        {/* PER-SERVICE COVERAGE — the important part. */}
        <Panel className="xl:col-span-2">
          <PanelTitle right={<Pill tone="primary">{provider}</Pill>}>
            Coverage where you are
          </PanelTitle>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <Label>{categoryLabels[cat]}</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {services
                    .filter((s) => s.category === cat)
                    .map((s) => {
                      const c = coverageFor(s.id);
                      const tone =
                        c.status === "available" ? "go" : c.status === "limited" ? "warn" : "alert";
                      return (
                        <div
                          key={s.id}
                          className="flex min-h-[76px] items-center gap-3 rounded-lg border border-primary/20 bg-background p-3"
                        >
                          <ServiceBadge id={s.id} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-display text-sm uppercase tracking-[0.12em]">
                                {s.name}
                              </span>
                              <Pill tone={tone}>
                                {c.status === "none"
                                  ? "Not available here"
                                  : c.status === "limited"
                                    ? `Thin · ${c.etaMin}m`
                                    : c.etaMin && c.etaMin >= 720
                                      ? "Next day"
                                      : `${c.etaMin} min ETA`}
                              </Pill>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {c.status === "none" ? `No ${s.name} available in this area.` : c.note}
                              {c.deliveryFee ? ` · ${money2(c.deliveryFee)} delivery` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ask out loud: “is there any delivery here”, “no DoorDash?”, “where does delivery work
            next”. HERCULES reads the same answers aloud — {spoken("instacart")}
          </p>
        </Panel>

        {/* WHERE TO MEET + coverage ahead */}
        <div className="space-y-3">
          <Panel>
            <PanelTitle>Where to meet you</PanelTitle>
            <p className="text-sm text-muted-foreground">
              Delivery routes to your live position. This note is what the courier sees.
            </p>
            <div className="mt-3 space-y-2">
              {meetPresets.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeetNote(m)}
                  className={`flex min-h-[56px] w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                    meetNote === m
                      ? "border-primary/70 bg-primary/10 text-primary shadow-[0_0_18px_-8px_var(--primary)]"
                      : "border-primary/20 bg-background text-foreground/85 hover:border-primary/50"
                  }`}
                >
                  <MapPin className="h-4 w-4 shrink-0" />
                  {m}
                </button>
              ))}
            </div>
            <input
              value={meetNote}
              onChange={(e) => setMeetNote(e.target.value)}
              placeholder="Bay, gate or lot — e.g. “Dock 14, gate B”"
              className="mt-2 min-h-[56px] w-full rounded-lg border border-primary/25 bg-background px-3 text-sm outline-none focus:border-primary/70"
            />
          </Panel>

          <Panel>
            <PanelTitle>Coverage ahead on your route</PanelTitle>
            <div className="space-y-2">
              {coveragePoints.map((p) => {
                const good = p.coverage.filter((c) => c.status === "available").length;
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-primary/20 bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm uppercase tracking-[0.12em]">
                        {p.label}
                      </span>
                      <Pill tone={good > 3 ? "go" : "warn"}>{good} services</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.detail} · {p.milesAhead} mi ahead
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.coverage
                        .filter((c) => c.status === "available")
                        .slice(0, 4)
                        .map((c) => serviceOf(c.service).name)
                        .join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* WHAT HERCULES CAN ACTUALLY GET YOU */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelTitle right={<Pill tone="primary">Suggestions only</Pill>}>
            Read back your options
          </PanelTitle>
          <div className="space-y-2">
            {reachable.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-background p-3"
              >
                <ServiceBadge id={o.service} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm uppercase tracking-[0.12em]">{o.vendor}</div>
                  <p className="text-sm text-foreground/85">{o.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {money2(o.subtotal)} + {money2(o.deliveryFee)} delivery ·{" "}
                    {money2(o.subtotal + o.deliveryFee)} total · about {o.etaMin} min · {o.note}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPending(o)}
                  className="min-h-[56px] border-primary/40 text-primary hover:bg-primary/10"
                >
                  Read it back
                </Button>
              </div>
            ))}
            {blocked.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/35 bg-destructive/8 p-3 opacity-80"
              >
                <ServiceBadge id={o.service} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm uppercase tracking-[0.12em]">{o.vendor}</div>
                  <p className="mt-1 text-xs text-destructive">
                    No {serviceOf(o.service).name} available in this area.
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <DriverApprovedNote>
              HERCULES reads prices and ETAs aloud and waits. Nothing is ordered, charged, or
              dispatched until you say yes.
            </DriverApprovedNote>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel>
            <PanelTitle right={<Pill tone="primary">By voice</Pill>}>Favourites</PanelTitle>
            <div className="space-y-2">
              {favorites.map((f) => {
                const dead = coverageFor(f.service).status === "none";
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => reorder(f.id)}
                    className="flex min-h-[76px] w-full items-start gap-3 rounded-lg border border-primary/20 bg-background p-3 text-left transition-all hover:border-primary/60"
                  >
                    <Star className="mt-0.5 h-5 w-5 shrink-0 text-primary/80" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm uppercase tracking-[0.12em]">
                        {f.label}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {serviceOf(f.service).name} · {f.vendor} · last {money2(f.lastTotal)} on{" "}
                        {f.lastOrdered}
                      </p>
                      {dead ? (
                        <p className="mt-1 text-xs text-destructive">
                          No {serviceOf(f.service).name} available in this area
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Say “reorder the usual” and HERCULES reads the whole thing back before placing it.
            </p>
          </Panel>

          <Panel>
            <PanelTitle>Orders</PanelTitle>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing placed. Orders you approve show here with a cancel option.
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-lg border border-go/40 bg-go/8 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm uppercase tracking-[0.12em]">
                        {o.vendor}
                      </span>
                      <Pill tone="go">
                        <Clock className="h-3 w-3" />
                        {o.etaMin} min
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {serviceOf(o.service).name} · {money2(o.total)} · {o.dropLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">Meet: {o.meetNote}</p>
                    <button
                      type="button"
                      onClick={() => cancel(o.id)}
                      className="tech-label mt-2 flex min-h-[48px] items-center gap-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                      Cancel this order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* DRIVER APPROVED read-back — the only way an order is ever placed. */}
      {pending ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/80 p-4 sm:items-center">
          <div className="glass w-full max-w-lg p-5 shadow-[0_0_40px_-12px_color-mix(in_oklab,var(--primary)_60%,var(--violet))]">
            <div className="flex items-center gap-3">
              <ShoppingBasket className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold uppercase tracking-wide">Read back before I order</h3>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-foreground/85">
                {serviceOf(pending.service).name} · {pending.vendor}
              </p>
              <ul className="ml-4 list-disc text-muted-foreground">
                {pending.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <div className="mt-3 space-y-1 border-t border-primary/20 pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{money2(pending.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{money2(pending.deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary">
                  <span>Total charged</span>
                  <span>{money2(pending.subtotal + pending.deliveryFee)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                To {location.label} · meet: {meetNote || "At the truck"} · about {pending.etaMin}{" "}
                minutes
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={confirm}
                className="min-h-[60px] flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-5 w-5" />
                Approve &amp; order
              </Button>
              <Button
                variant="outline"
                onClick={() => setPending(null)}
                className="min-h-[60px] flex-1 border-primary/30"
              >
                Not now
              </Button>
            </div>
            <div className="mt-3">
              <DriverApprovedNote />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
