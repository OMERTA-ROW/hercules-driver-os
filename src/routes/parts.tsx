import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  Loader2,
  MapPin,
  Mic,
  Package,
  Receipt,
  Search,
  Truck,
  Volume2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import {
  DriverApprovedNote,
  Label,
  Panel,
  PanelTitle,
  Pill,
  money2,
} from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categoryById,
  supplyCategories,
  supplierById,
  spokenListing,
  type Listing,
  type SupplyCategoryId,
} from "@/data/parts";
import { feeConfig } from "@/data/fees";
import { boltFaults } from "@/data/bolt";
import { services as breakdownServices } from "@/data/breakdown";
import { rank } from "@/lib/breakdown";
import { useParts, type Quote } from "@/lib/parts";
import { useVoice } from "@/lib/voice";

export const Route = createFileRoute("/parts")({
  head: () => ({
    meta: [
      { title: "Supply & Parts — HERCULES" },
      {
        name: "description",
        content:
          "Describe the part or read out a fault code and HERCULES sources it from dealers and aftermarket suppliers along your route — with the service fee shown before you approve.",
      },
      { property: "og:title", content: "Supply & Parts — HERCULES" },
      {
        property: "og:description",
        content:
          "Voice-ordered truck parts, tires, roadside service, fuel and DEF, showers, securement, tools and permits — priced, sourced along your route, approved by you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartsPage,
});

function PartsPage() {
  const { say, announce } = useVoice();
  const {
    identify,
    identifying,
    matches,
    active,
    setActive,
    sourceFault,
    itemsFor,
    quote,
    place,
    cancel,
    orders,
    feesPaid,
  } = useParts();

  const [category, setCategory] = useState<SupplyCategoryId>("parts");
  const [term, setTerm] = useState("");
  const [pending, setPending] = useState<Quote | null>(null);

  /* Read the shelf back the first time the screen opens, hands-free. */
  useEffect(() => {
    void identify("soot filter pressure sensor");
  }, [identify]);

  const cfg = feeConfig[categoryById(category).fee];
  const items = useMemo(() => itemsFor(category), [category, itemsFor]);
  const nearestMechanic = useMemo(() => rank(breakdownServices)[0], []);
  const live = orders.filter((o) => o.status === "placed");

  function readBack(label: string, cat: SupplyCategoryId, listing: Listing, partNumber?: string) {
    const q = quote(label, cat, listing, partNumber);
    setPending(q);
    announce(`${q.spoken} Say yes and I'll place it. Nothing is charged until you do.`);
  }

  function approve() {
    if (!pending) return;
    const order = place(pending);
    toast.success(`Ordered on your word — ${order.label}`, {
      description: `${money2(order.total)} charged, including the ${money2(
        order.herculesFee,
      )} HERCULES service fee. ${order.ready}`,
    });
    announce(
      `Placed. ${order.label} from ${order.vendor}, ${order.total.toFixed(
        2,
      )} dollars including the ${order.herculesFee.toFixed(
        2,
      )} dollar HERCULES service fee. ${order.ready}.`,
    );
    setPending(null);
  }

  return (
    <AppShell
      title="Supply & Parts"
      subtitle="Describe it or read me the code. HERCULES prices it, shows the fee, and waits for your yes."
    >
      {/* ------------------------------------------------------- VOICE FIRST */}
      <Panel className="border-primary/45">
        <PanelTitle
          right={
            <Pill tone="primary">
              <Truck className="h-3.5 w-3.5" /> Priced along your route
            </Pill>
          }
        >
          Tell HERCULES What You Need
        </PanelTitle>
        <p className="text-sm text-muted-foreground">
          “I need an air dryer.” “Read me what SPN 3251 needs.” “I need four straps.” “Book me a
          shower and a space.” HERCULES identifies it, checks the counters ahead of you, and reads
          back the price, the fee and the wait before anything is ordered.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="lg"
            className="h-16 gap-2 text-base"
            onClick={() => say("I need a part, my soot filter sensor is acting up")}
          >
            <Mic className="h-5 w-5" /> Talk it through
          </Button>
          <div className="flex min-w-[16rem] flex-1 gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Part, symptom or fault code"
              aria-label="Describe the part or read a fault code"
              className="h-16 flex-1 rounded-lg border border-primary/25 bg-background px-4 text-base outline-none focus:border-primary/70"
            />
            <Button
              size="lg"
              variant="outline"
              className="h-16 gap-2"
              onClick={() => term.trim() && void identify(term)}
            >
              <Search className="h-5 w-5" /> Source it
            </Button>
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------- FAULT CODE SOURCING */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="alert">{boltFaults.length} live codes</Pill>}>
          Straight Off THE BOLT
        </PanelTitle>
        <p className="mb-2 text-sm text-muted-foreground">
          A code comes in, HERCULES already knows the likely part. One tap and it's priced.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {boltFaults.map((f) => (
            <div key={f.code} className="rounded-lg border border-warn/40 bg-warn/8 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="metric font-bold">{f.code}</span>
                <Pill tone={f.severity === "alert" ? "alert" : "watch"}>{f.system}</Pill>
              </div>
              <p className="mt-1 text-sm leading-snug">{f.plain}</p>
              <Button
                size="lg"
                variant="outline"
                className="mt-2 h-14 w-full gap-2"
                onClick={() => {
                  const p = sourceFault(f.code);
                  setCategory("parts");
                  announce(
                    p
                      ? `${f.code} points at the ${p.name}, part number ${p.partNumber}. ${p.why} I've got prices along your route — nothing ordered.`
                      : `I don't have a confident part for ${f.code}. I'd have a mechanic put eyes on it before you spend money.`,
                  );
                }}
              >
                <Wrench className="h-5 w-5" /> Source the part for this code
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      {/* ------------------------------------------------------- CATEGORY RAIL */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="info">{cfg.label} fee ladder applies</Pill>}>
          What Kind Of Order
        </PanelTitle>
        <div className="flex flex-wrap gap-2">
          {supplyCategories.map((c) => (
            <Button
              key={c.id}
              size="lg"
              variant={c.id === category ? "default" : "outline"}
              className="h-16 min-w-[11rem] justify-center text-base"
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{categoryById(category).blurb}</p>
      </Panel>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {/* ------------------------------------------------ PART MATCHES */}
          {category === "parts" ? (
            <Panel>
              <PanelTitle
                right={
                  identifying ? (
                    <Pill tone="neutral">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking counters
                    </Pill>
                  ) : (
                    <Pill tone="primary">{matches.length} likely</Pill>
                  )
                }
              >
                Likely Part
              </PanelTitle>
              {matches.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {matches.map((m) => (
                    <Button
                      key={m.id}
                      size="lg"
                      variant={m.id === active?.id ? "secondary" : "ghost"}
                      className="h-14"
                      onClick={() => setActive(m)}
                    >
                      {m.name}
                    </Button>
                  ))}
                </div>
              ) : null}
              {active ? (
                <>
                  <div className="rounded-lg border border-primary/35 bg-primary/8 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-xl font-semibold uppercase tracking-wide">
                        {active.name}
                      </h3>
                      <Pill tone="primary">{active.confidence}% match</Pill>
                    </div>
                    <p className="metric mt-1 text-sm text-primary">{active.partNumber}</p>
                    <p className="mt-2 text-sm leading-snug">{active.why}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {active.listings.map((l) => (
                      <ListingRow
                        key={l.id}
                        listing={l}
                        onOrder={() => readBack(active.name, "parts", l, active.partNumber)}
                        onRead={() =>
                          announce(spokenListing(active.name, l))
                        }
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Say what's wrong or read me a code and I'll name the part.
                </p>
              )}
            </Panel>
          ) : (
            /* ------------------------------------------- NON-PARTS SUPPLY */
            <Panel>
              <PanelTitle right={<Pill tone="primary">{items.length} available</Pill>}>
                {categoryById(category).label}
              </PanelTitle>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-card/60 p-3">
                    <h3 className="font-display text-lg font-semibold uppercase tracking-wide">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    <div className="mt-2 space-y-2">
                      {item.listings.map((l) => (
                        <ListingRow
                          key={l.id}
                          listing={l}
                          onOrder={() => readBack(item.name, category, l)}
                          onRead={() => announce(spokenListing(item.name, l))}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {!items.length ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing in this category on your route right now. Ask me and I'll widen it out.
                  </p>
                ) : null}
              </div>
            </Panel>
          )}

          {/* ------------------------------------- PARTS + MECHANIC IN ONE FLOW */}
          {nearestMechanic ? (
            <Panel className="border-violet/40">
              <PanelTitle right={<Pill tone="info">One flow</Pill>}>
                Part Plus Somebody To Fit It
              </PanelTitle>
              <p className="text-sm text-muted-foreground">
                Closest heavy-duty help right now is {nearestMechanic.name} —{" "}
                {nearestMechanic.milesAway.toFixed(1)} mi, about {nearestMechanic.etaMin} min
                {nearestMechanic.open24 ? ", open 24 hours" : ""}. Order the part here, and Breakdown
                Assist calls them on your word only.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="lg" className="h-14 gap-2">
                  <Link to="/breakdown">
                    <Wrench className="h-5 w-5" /> Take this to Breakdown Assist
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 gap-2"
                  onClick={() => say("I need a mobile mechanic and the part")}
                >
                  <Mic className="h-5 w-5" /> Do it by voice
                </Button>
              </div>
            </Panel>
          ) : null}
        </div>

        {/* ----------------------------------------------- FEE + ORDER HISTORY */}
        <div className="space-y-3">
          <Panel className="border-primary/40">
            <PanelTitle right={<Pill tone="info">Shown before you approve</Pill>}>
              <span className="inline-flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> HERCULES Service Fee
              </span>
            </PanelTitle>
            <p className="text-sm text-muted-foreground">
              {cfg.note}. The fee scales with the order and it is a line item you see and hear before
              you say yes. It is what keeps HERCULES running and the platform operating — it is not a
              discount and it is not absorbed.
            </p>
            <div className="mt-3 space-y-1">
              {cfg.tiers.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                  <span className="metric font-bold text-primary">${t.fee.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-go">
              Food, grocery, retail and pharmacy delivery carry no HERCULES fee — those platforms
              charge you directly and HERCULES only fills the order in.{" "}
              <Link to="/supply" className="text-primary underline">
                That's the hand-off screen
              </Link>
              .
            </p>
          </Panel>

          <Panel>
            <PanelTitle
              right={
                <Pill tone={live.length ? "go" : "neutral"}>
                  {live.length} live · {money2(feesPaid)} in fees
                </Pill>
              }
            >
              Your Orders
            </PanelTitle>
            {!orders.length ? (
              <p className="text-sm text-muted-foreground">
                Nothing ordered. HERCULES has not spent a cent of your money.
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className={
                      "rounded-lg border p-3 " +
                      (o.status === "cancelled"
                        ? "border-border bg-card/40 opacity-60"
                        : "border-primary/35 bg-primary/8")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-semibold uppercase tracking-wide">
                          {o.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.vendor} · {o.location}
                        </p>
                      </div>
                      <Pill tone={o.status === "cancelled" ? "neutral" : "go"}>
                        {o.status === "cancelled" ? "cancelled" : "placed"}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{o.ready}</p>
                    <p className="metric mt-1 text-lg font-bold text-primary">
                      {money2(o.total)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        incl. {money2(o.herculesFee)} HERCULES fee
                      </span>
                    </p>
                    {o.status === "placed" ? (
                      <Button
                        size="lg"
                        variant="ghost"
                        className="mt-2 h-12 w-full gap-2"
                        onClick={() => {
                          cancel(o.id);
                          toast.info("Cancelled on your word", {
                            description: "The fee comes off with it.",
                          });
                        }}
                      >
                        <X className="h-4 w-4" /> Cancel this order
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <DriverApprovedNote>
              HERCULES sources and prices. You approve. Nothing is ordered, dispatched or charged
              without your explicit yes.
            </DriverApprovedNote>
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------------ ORDER CONFIRMATION */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl uppercase">Place this order?</DialogTitle>
            <DialogDescription>
              HERCULES reads it back with every charge on it. Nothing is ordered or paid for until you
              approve it.
            </DialogDescription>
          </DialogHeader>
          {pending ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-card/70 p-3">
                <Label>{categoryById(pending.category).label}</Label>
                <p className="font-display text-lg font-semibold uppercase tracking-wide">
                  {pending.label}
                </p>
                {pending.partNumber ? (
                  <p className="metric text-sm text-primary">{pending.partNumber}</p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {pending.vendor} · {pending.listing.location}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{pending.listing.ready}</p>
              </div>
              <div className="rounded-lg border border-primary/45 bg-primary/10 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Order</span>
                  <span className="metric font-bold">{money2(pending.subtotal)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-primary">
                  <span>HERCULES service fee</span>
                  <span className="metric font-bold">{money2(pending.fee)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-primary/30 pt-2">
                  <span className="tech-label">Total charged</span>
                  <span className="metric text-2xl font-bold text-primary">
                    {money2(pending.total)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-snug text-muted-foreground">
                  The {money2(pending.fee)} fee is HERCULES' charge for sourcing it, placing it and
                  paying the supplier. It is what keeps HERCULES running. It is never hidden and never
                  added after the fact.
                </p>
              </div>
              <DriverApprovedNote>
                You are approving this order and this charge. HERCULES does not order anything on its
                own.
              </DriverApprovedNote>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button size="lg" variant="ghost" className="h-14" onClick={() => setPending(null)}>
              Not now
            </Button>
            <Button size="lg" className="h-14 gap-2 text-base" onClick={approve}>
              <Check className="h-5 w-5" /> Approve & order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ListingRow({
  listing,
  onOrder,
  onRead,
}: {
  listing: Listing;
  onOrder: () => void;
  onRead: () => void;
}) {
  const s = supplierById(listing.supplierId);
  const tint =
    s.tint === "primary"
      ? "border-primary/50 bg-primary/12 text-primary"
      : s.tint === "violet"
        ? "border-violet/50 bg-violet/12 text-violet"
        : "border-border bg-secondary text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-display text-sm font-bold tracking-wider " +
              tint
            }
          >
            {s.badge}
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold uppercase tracking-wide">{s.name}</p>
            <p className="text-xs text-muted-foreground">{listing.location}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3" />
              {listing.comesToYou
                ? "Comes out to the truck"
                : listing.milesAhead === 0
                  ? "Delivered to your stop"
                  : `${listing.milesAhead} mi ahead · ${listing.milesOffRoute.toFixed(1)} mi off route`}
            </p>
            <p className="mt-1 text-xs">{listing.ready}</p>
            <p className="mt-1 text-xs text-muted-foreground">{listing.note}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="metric text-2xl font-bold text-primary">{money2(listing.price)}</p>
          <Pill tone={listing.inStock > 0 ? "go" : "watch"} className="mt-1">
            <Package className="h-3 w-3" />
            {listing.inStock > 0 ? `${listing.inStock} in stock` : "order in"}
          </Pill>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="lg" className="h-14 gap-2 text-base" onClick={onOrder}>
          <Receipt className="h-5 w-5" /> Read it back with the fee
        </Button>
        <Button size="lg" variant="outline" className="h-14 gap-2" onClick={onRead}>
          <Volume2 className="h-5 w-5" /> Read it to me
        </Button>
      </div>
    </div>
  );
}
