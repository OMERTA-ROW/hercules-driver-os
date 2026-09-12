import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Fuel,
  ShowerHead,
  ParkingSquare,
  Scale,
  UtensilsCrossed,
  Clock,
  Mic,
  Link2,
  Unlink,
  X,
  Check,
  Coffee,
} from "lucide-react";
import { AppShell } from "@/components/hercules/AppShell";
import {
  Panel,
  PanelTitle,
  Label,
  Metric,
  Pill,
  Bar,
  DriverApprovedNote,
  money2,
  hm,
} from "@/components/hercules/primitives";
import { ChainMarker } from "@/components/hercules/ChainMarker";
import { Button } from "@/components/ui/button";
import { useHours } from "@/lib/live";
import {
  BOOKING_FEE,
  amenityLabels,
  chainOf,
  chains,
  loyaltyPrograms,
  parkingWindows,
  showerWindows,
  type Amenity,
  type ChainId,
  type ReservationKind,
  type TruckStop,
} from "@/data/stops";
import { useStops } from "@/lib/stops";
import { CoverageNotice } from "@/components/hercules/CoverageNotice";

export const Route = createFileRoute("/stops")({
  head: () => ({
    meta: [
      { title: "Truck Stops & Pit Stops — HERCULES" },
      {
        name: "description",
        content:
          "Branded truck stops along your route with diesel price, parking counts, showers and scales — plus loyalty accounts and shower or parking reservations you approve yourself.",
      },
      { property: "og:title", content: "Truck Stops & Pit Stops — HERCULES" },
      {
        property: "og:description",
        content:
          "Find, filter, and book showers and truck parking ahead of you. Every fee shown before you confirm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StopsScreen,
});

const distanceChoices = [50, 100, 200, 400] as const;
const amenityFilters: Amenity[] = ["showers", "parking", "scales", "food"];

function StopsScreen() {
  const { hours } = useHours();
  /** Range left on the driver's own logged clock. No clock, no guess. */
  const rangeMiles = hours ? Math.round((hours.driveRemainingMin / 60) * 55) : null;
  const { stops, accounts, accountFor, linkLoyalty, unlinkLoyalty, reservations, book, cancel, effectiveDiesel, provider } =
    useStops();

  const [chainFilter, setChainFilter] = useState<ChainId[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<Amenity[]>([]);
  const [maxMiles, setMaxMiles] = useState<number>(200);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    stop: TruckStop;
    kind: ReservationKind;
    window: string;
    useCredit: boolean;
  } | null>(null);
  const [signIn, setSignIn] = useState<{ chain: ChainId; value: string } | null>(null);

  const visible = useMemo(
    () =>
      stops.filter(
        (s) =>
          s.milesAhead <= maxMiles &&
          (chainFilter.length === 0 || chainFilter.includes(s.chain)) &&
          amenityFilter.every((a) => s.amenities.includes(a)),
      ),
    [stops, maxMiles, chainFilter, amenityFilter],
  );

  const selected = visible.find((s) => s.id === selectedId) ?? visible[0] ?? null;

  /** Clock-aware suggestion: bookable stops the driver can still legally reach. */
  const clockTight = hours !== null && hours.driveRemainingMin <= 300;
  const inRange = stops.filter(
    (s) => rangeMiles !== null && s.milesAhead <= rangeMiles && s.parkingReservable && s.showersOpen > 0,
  );

  const toggle = <T,>(list: T[], v: T, set: (n: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function voiceFind() {
    setAmenityFilter(["showers", "parking"]);
    setMaxMiles(100);
    setChainFilter([]);
    const options = stops.filter(
      (s) => s.milesAhead <= 100 && s.showersOpen > 0 && s.parkingOpen > 0,
    );
    const first = options[0];
    setSpoken(
      first
        ? `I found ${options.length} stops with a shower and open parking inside 100 miles. Closest is ${first.name}, ${first.exit}, ${first.milesAhead} miles ahead — ${first.showersOpen} showers open and ${first.parkingOpen} of ${first.parkingTotal} spaces free. Shower is ${money2(first.showerPrice)} plus a two dollar HERCULES booking fee. Say "book it" and I will read the total back before anything is charged.`
        : "I could not find a stop with both a shower and open parking inside 100 miles. Want me to look 200 miles out?",
    );
    if (first) setSelectedId(first.id);
  }

  async function confirmBooking() {
    if (!pending) return;
    const res = await book(pending);
    setPending(null);
    setSpoken(
      `Booked. ${res.kind === "shower" ? "Shower" : "Parking"} at ${res.stopName}, ${res.window}. ${
        res.usedShowerCredit
          ? "Shower credit applied, so you paid only the two dollar HERCULES booking fee"
          : `${money2(res.base)} plus a ${money2(res.fee)} HERCULES booking fee`
      }, total ${money2(res.total)}. It is on your My Stops list and you can cancel any time.`,
    );
  }

  return (
    <AppShell
      title="Truck Stops"
      subtitle="Fuel, showers, parking and scales ahead of you — book without leaving HERCULES"
    >
      {/* Proactive delivery-coverage warning for where the truck sits. */}
      <CoverageNotice />

      {/* Proactive, clock-aware suggestion. Still only a suggestion. */}
      {clockTight ? (
        <Panel className="mb-3 border-warn/50 bg-warn/8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-7 w-7 shrink-0 text-warn" />
              <div>
                <div className="text-lg font-semibold uppercase tracking-wide text-warn">
                  {hm(hours?.driveRemainingMin ?? 0)} of drive time left — about {rangeMiles} miles
                </div>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {inRange.length} bookable stops with a shower and reservable parking are inside
                  your range. Shut down early with a space held rather than hunting a lot at 2am.
                  Your call — nothing is reserved until you confirm.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-14 px-5 text-base"
              onClick={() => {
                setMaxMiles(200);
                setAmenityFilter(["showers", "parking"]);
                setSelectedId(inRange[0]?.id ?? null);
              }}
            >
              Show stops in range
            </Button>
          </div>
        </Panel>
      ) : null}

      {spoken ? (
        <Panel className="mb-3 border-primary/40 bg-primary/8">
          <div className="flex items-start gap-3">
            <Mic className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <Label>Hercules said</Label>
              <p className="mt-1 text-base leading-relaxed">{spoken}</p>
            </div>
            <Button variant="ghost" className="ml-auto h-11 w-11 p-0" onClick={() => setSpoken(null)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </Panel>
      ) : null}

      {/* FILTERS */}
      <Panel className="mb-3">
        <PanelTitle
          right={
            <Button variant="outline" className="h-12 gap-2 px-4" onClick={voiceFind}>
              <Mic className="h-5 w-5" /> "Find me a shower and parking in 100 miles"
            </Button>
          }
        >
          Filter stops ahead
        </PanelTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label>Distance ahead on route</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {distanceChoices.map((d) => (
                <Button
                  key={d}
                  variant={maxMiles === d ? "default" : "outline"}
                  className="h-14 min-w-[92px] text-base"
                  onClick={() => setMaxMiles(d)}
                >
                  {d} mi
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Amenity</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {amenityFilters.map((a) => (
                <Button
                  key={a}
                  variant={amenityFilter.includes(a) ? "default" : "outline"}
                  className="h-14 text-base"
                  onClick={() => toggle(amenityFilter, a, setAmenityFilter)}
                >
                  {amenityLabels[a]}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Chain</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {chains.map((c) => (
                <Button
                  key={c.id}
                  variant={chainFilter.includes(c.id) ? "default" : "outline"}
                  className="h-14 gap-2 text-base"
                  onClick={() => toggle(chainFilter, c.id, setChainFilter)}
                >
                  <ChainMarker chain={c.id} /> {c.short}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Distance is measured ahead along your current truck-legal route, not straight line.
          Live prices, parking counts and shower availability come from the stop feed ({provider}).
        </p>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
        {/* STOP LIST */}
        <Panel>
          <PanelTitle right={<Pill tone="info">{visible.length} ahead</Pill>}>
            Stops within {maxMiles} miles
          </PanelTitle>
          <div className="space-y-2">
            {visible.map((s) => {
              const c = chainOf(s.chain);
              const acct = accountFor(s.chain);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selected?.id === s.id
                      ? "border-primary/60 bg-primary/8"
                      : "border-border bg-secondary/40 hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ChainMarker chain={s.chain} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-base font-semibold">{s.name}</span>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {c.name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">{s.exit}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <Pill tone="primary">{s.milesAhead} mi · {hm(s.etaMin)}</Pill>
                        <Pill tone="go">
                          <Fuel className="h-3.5 w-3.5" /> ${effectiveDiesel(s).toFixed(3)}/gal
                          {acct ? " (member)" : ""}
                        </Pill>
                        <Pill tone={s.parkingOpen > 10 ? "go" : "warn"}>
                          <ParkingSquare className="h-3.5 w-3.5" /> {s.parkingOpen}/{s.parkingTotal} open
                        </Pill>
                        {s.showers > 0 ? (
                          <Pill tone={s.showersOpen > 0 ? "go" : "alert"}>
                            <ShowerHead className="h-3.5 w-3.5" /> {s.showersOpen} showers
                          </Pill>
                        ) : (
                          <Pill tone="neutral">No showers</Pill>
                        )}
                        {s.scales ? (
                          <Pill tone="info">
                            <Scale className="h-3.5 w-3.5" /> Scale
                          </Pill>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {visible.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                No stops match those filters inside {maxMiles} miles. Widen the distance or drop an
                amenity.
              </p>
            ) : null}
          </div>
          <div className="mt-3">
            <Link to="/navigation" className="text-sm font-semibold text-primary underline">
              See these stops on the navigation map
            </Link>
          </div>
        </Panel>

        {/* SELECTED STOP DETAIL + BOOKING */}
        <div className="space-y-3">
          {selected ? (
            <Panel>
              <PanelTitle right={<Pill tone="primary">{selected.milesAhead} mi ahead</Pill>}>
                {selected.name}
              </PanelTitle>
              <div className="flex items-start gap-3">
                <ChainMarker chain={selected.chain} size={56} />
                <div>
                  <div className="text-sm text-muted-foreground">{selected.exit}</div>
                  <div className="text-sm text-muted-foreground">
                    ETA {hm(selected.etaMin)} at current speed
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Diesel</Label>
                  <Metric value={`$${effectiveDiesel(selected).toFixed(3)}`} unit="/gal" tone="go" />
                  {accountFor(selected.chain) ? (
                    <div className="text-xs text-go">
                      ${selected.dieselPrice.toFixed(3)} posted · member discount applied
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Link {chainOf(selected.chain).loyalty ?? "loyalty"} to save $
                      {selected.loyaltyDiscount.toFixed(2)}/gal
                    </div>
                  )}
                </div>
                <div>
                  <Label>Truck parking</Label>
                  <Metric
                    value={`${selected.parkingOpen}`}
                    unit={`of ${selected.parkingTotal}`}
                    tone={selected.parkingOpen > 10 ? "default" : "warn"}
                  />
                  <Bar
                    className="mt-2"
                    tone={selected.parkingOpen > 10 ? "go" : "warn"}
                    pct={(selected.parkingOpen / selected.parkingTotal) * 100}
                  />
                </div>
                <div>
                  <Label>Showers</Label>
                  <Metric
                    value={selected.showers > 0 ? `${selected.showersOpen}` : "None"}
                    unit={selected.showers > 0 ? `of ${selected.showers}` : undefined}
                    tone={selected.showersOpen > 0 ? "default" : "alert"}
                  />
                  <div className="text-xs text-muted-foreground">
                    {selected.showers > 0
                      ? selected.showerWaitMin > 0
                        ? `About ${selected.showerWaitMin} min wait`
                        : "No wait right now"
                      : "Nearest showers are further up the road"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.amenities.map((a) => (
                  <Pill key={a} tone="neutral">
                    {amenityLabels[a]}
                  </Pill>
                ))}
                {selected.scales ? (
                  <Pill tone="info">
                    <Scale className="h-3.5 w-3.5" /> Scale on site
                  </Pill>
                ) : null}
              </div>
              <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{selected.food.join(" · ")}</span>
              </div>
              <p className="mt-2 text-sm">{selected.note}</p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  className="h-16 gap-2 text-base"
                  disabled={selected.showersOpen === 0}
                  onClick={() =>
                    setPending({
                      stop: selected,
                      kind: "shower",
                      window: showerWindows[1]!,
                      useCredit: (accountFor(selected.chain)?.showerCredits ?? 0) > 0,
                    })
                  }
                >
                  <ShowerHead className="h-5 w-5" /> Reserve a shower
                </Button>
                <Button
                  variant="outline"
                  className="h-16 gap-2 text-base"
                  disabled={!selected.parkingReservable}
                  onClick={() =>
                    setPending({
                      stop: selected,
                      kind: "parking",
                      window: parkingWindows[1]!,
                      useCredit: false,
                    })
                  }
                >
                  <ParkingSquare className="h-5 w-5" /> Reserve parking
                </Button>
              </div>
              {!selected.parkingReservable ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  This lot is first come, first served — no reservations offered.
                </p>
              ) : null}
              <DriverApprovedNote>
                Nothing is held or charged until you confirm on the next screen, fee and all.
              </DriverApprovedNote>
            </Panel>
          ) : null}

          {/* MY STOPS */}
          <Panel>
            <PanelTitle right={<Pill tone="go">{reservations.length} booked</Pill>}>My Stops</PanelTitle>
            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reservations yet. Showers and parking you book will show here with the window and
                what you paid.
              </p>
            ) : (
              <div className="space-y-2">
                {reservations.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <ChainMarker chain={r.chain} size={40} />
                      <div>
                        <div className="text-base font-semibold">
                          {r.kind === "shower" ? "Shower" : "Parking"} · {r.stopName}
                        </div>
                        <div className="text-sm text-muted-foreground">{r.window}</div>
                        <div className="text-sm">
                          {r.usedShowerCredit ? "Shower credit" : money2(r.base)} + HERCULES booking
                          fee {money2(r.fee)} = <strong>{money2(r.total)}</strong>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="h-12" onClick={() => cancel(r.id)}>
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* LOYALTY ACCOUNTS */}
      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="info">{accounts.length} linked</Pill>}>
          Loyalty accounts
        </PanelTitle>
        <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
          Sign in once and HERCULES shows your points, shower credits and fuel discount per chain,
          and applies the member price when it compares stops. Mock sign-in for now — real chain
          logins plug in behind the same screen.
        </p>
        <div className="grid gap-2 lg:grid-cols-2">
          {loyaltyPrograms.map((p) => {
            const acct = accountFor(p.chain);
            const c = chainOf(p.chain);
            return (
              <div key={p.chain} className="rounded-xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-3">
                  <ChainMarker chain={p.chain} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold">{p.program}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {c.name} · {p.authKind === "oauth" ? "Sign in with chain account" : "Card number + PIN"}
                    </div>
                  </div>
                  {acct ? (
                    <Button
                      variant="outline"
                      className="h-12 gap-2"
                      onClick={() => unlinkLoyalty(p.chain)}
                    >
                      <Unlink className="h-4 w-4" /> Unlink
                    </Button>
                  ) : (
                    <Button
                      className="h-12 gap-2"
                      onClick={() => setSignIn({ chain: p.chain, value: "" })}
                    >
                      <Link2 className="h-4 w-4" /> Link account
                    </Button>
                  )}
                </div>

                {acct ? (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <Label>Points</Label>
                      <div className="metric text-2xl font-bold">{acct.points.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{acct.tier}</div>
                    </div>
                    <div>
                      <Label>Shower credits</Label>
                      <div className="metric text-2xl font-bold text-go">{acct.showerCredits}</div>
                      <div className="text-xs text-muted-foreground">Applied automatically</div>
                    </div>
                    <div>
                      <Label>Fuel discount</Label>
                      <div className="metric text-2xl font-bold text-primary">
                        ${acct.fuelDiscount.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">per gallon</div>
                    </div>
                  </div>
                ) : null}

                {signIn?.chain === p.chain ? (
                  <form
                    className="mt-3 flex flex-wrap items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void linkLoyalty(p.chain, signIn.value);
                      setSignIn(null);
                    }}
                  >
                    <div className="min-w-[220px] flex-1">
                      <Label>{p.signInHint}</Label>
                      <input
                        autoFocus
                        value={signIn.value}
                        onChange={(e) => setSignIn({ chain: p.chain, value: e.target.value })}
                        className="mt-1 h-14 w-full rounded-lg border border-border bg-input px-3 text-base"
                        placeholder={p.signInHint}
                      />
                    </div>
                    <Button type="submit" className="h-14 gap-2 px-5">
                      <Check className="h-5 w-5" /> Sign in
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-14"
                      onClick={() => setSignIn(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* BOOKING CONFIRMATION — explicit driver approval, fee shown as its own line */}
      {pending ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-background/85 p-4">
          <Panel className="w-full max-w-xl">
            <PanelTitle right={<Pill tone="warn">Not booked yet</Pill>}>
              Confirm {pending.kind === "shower" ? "shower" : "parking"} reservation
            </PanelTitle>
            <div className="flex items-start gap-3">
              <ChainMarker chain={pending.stop.chain} size={52} />
              <div>
                <div className="text-lg font-semibold">{pending.stop.name}</div>
                <div className="text-sm text-muted-foreground">{pending.stop.exit}</div>
              </div>
            </div>

            <div className="mt-4">
              <Label>Reservation window</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(pending.kind === "shower" ? showerWindows : parkingWindows).map((w) => (
                  <Button
                    key={w}
                    variant={pending.window === w ? "default" : "outline"}
                    className="h-14 text-base"
                    onClick={() => setPending({ ...pending, window: w })}
                  >
                    {w}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Live availability:{" "}
                {pending.kind === "shower"
                  ? `${pending.stop.showersOpen} of ${pending.stop.showers} showers open`
                  : `${pending.stop.parkingOpen} of ${pending.stop.parkingTotal} spaces open`}
                .
              </p>
            </div>

            {pending.kind === "shower" && (accountFor(pending.stop.chain)?.showerCredits ?? 0) > 0 ? (
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-go/40 bg-go/8 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={pending.useCredit}
                  onChange={(e) => setPending({ ...pending, useCredit: e.target.checked })}
                  className="h-6 w-6 accent-[var(--go,#22c55e)]"
                />
                <span>
                  Use one of your {accountFor(pending.stop.chain)!.showerCredits} shower credits
                  ({chainOf(pending.stop.chain).loyalty})
                </span>
              </label>
            ) : null}

            {/* FEE TRANSPARENCY — never hidden, never bundled */}
            <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3">
              <Label>Booking summary</Label>
              <div className="mt-2 space-y-1 text-base">
                <div className="flex justify-between">
                  <span>
                    {pending.kind === "shower" ? "Shower" : "Parking space"}
                    {pending.useCredit ? " (loyalty shower credit)" : ""}
                  </span>
                  <strong>
                    {pending.useCredit
                      ? "$0.00"
                      : money2(
                          pending.kind === "shower"
                            ? pending.stop.showerPrice
                            : pending.stop.parkingPrice,
                        )}
                  </strong>
                </div>
                <div className="flex justify-between text-warn">
                  <span>HERCULES booking fee</span>
                  <strong>{money2(BOOKING_FEE)}</strong>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-xl font-bold">
                  <span>Total charged</span>
                  <span>
                    {money2(
                      (pending.useCredit
                        ? 0
                        : pending.kind === "shower"
                          ? pending.stop.showerPrice
                          : pending.stop.parkingPrice) + BOOKING_FEE,
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The {money2(BOOKING_FEE)} fee is HERCULES' charge for booking it for you — it is not
                part of your subscription and it is charged once per reservation.
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button className="h-16 gap-2 text-base" onClick={() => void confirmBooking()}>
                <Check className="h-5 w-5" /> Approve &amp; book —{" "}
                {money2(
                  (pending.useCredit
                    ? 0
                    : pending.kind === "shower"
                      ? pending.stop.showerPrice
                      : pending.stop.parkingPrice) + BOOKING_FEE,
                )}
              </Button>
              <Button variant="outline" className="h-16 text-base" onClick={() => setPending(null)}>
                Not now
              </Button>
            </div>
            <DriverApprovedNote>
              You are the captain. HERCULES found it and priced it — nothing is reserved or charged
              until you tap Approve &amp; book.
            </DriverApprovedNote>
          </Panel>
        </div>
      ) : null}

      <Panel className="mt-3">
        <PanelTitle right={<Pill tone="info">Works with your clock</Pill>}>
          <span className="flex items-center gap-2">
            <Coffee className="h-5 w-5" /> How this ties together
          </span>
        </PanelTitle>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>· Stops are ranked by distance ahead on your current truck-legal route.</li>
          <li>· Your hours of service decide which stops HERCULES suggests as shutdown options.</li>
          <li>
            · The load board's parking intelligence and this layer share the same lots, so a receiver
            with no overnight parking always points at a bookable one.
          </li>
          <li>· Linked loyalty accounts change the fuel price HERCULES compares with.</li>
        </ul>
      </Panel>
    </AppShell>
  );
}
