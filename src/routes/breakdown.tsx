import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  LifeBuoy,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Stethoscope,
  Triangle,
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
  breakdownResetPlan,
  problems,
  shoulderGuidance,
  type Fix,
  type ProblemId,
  type Service,
} from "@/data/breakdown";
import { useCurrentLoad, place } from "@/lib/live";
import { useBolt } from "@/lib/bolt";
import {
  getBreakdownProvider,
  label as kindLabel,
  spokenLocation,
  spokenService,
} from "@/lib/breakdown";
import { useVoice } from "@/lib/voice";
import { countdownLabel, useArrivals } from "@/lib/arrivals";
import { feeBands } from "@/data/fees";

export const Route = createFileRoute("/breakdown")({
  head: () => ({
    meta: [
      { title: "Breakdown Assist — HERCULES" },
      {
        name: "description",
        content:
          "Say \"I'm broke down\" and HERCULES reads your exact location back, ranks heavy-duty mechanics, mobile repair, truck-capable tow and truck stop service bays, and rebuilds your day.",
      },
      { property: "og:title", content: "Breakdown Assist — HERCULES" },
      {
        property: "og:description",
        content:
          "Hands-free roadside help: exact location read aloud, ranked truck service, fault codes, safe-shoulder guidance, and an automatic day rebuild.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BreakdownPage,
});

function BreakdownPage() {
  const { say, announce } = useVoice();
  const boltFaults = useBolt().snapshot.faults;
  const { inbound, expectMechanic, setQuote, markArrived, dismiss, now } = useArrivals();
  /* The mechanic HERCULES is currently timing, if any. */
  const tracked = inbound.find((a) => a.kind === "mechanic");
  const [fix, setFix] = useState<Fix | null>(null);
  const [problem, setProblem] = useState<ProblemId>("unknown");
  const [results, setResults] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<Service | null>(null);
  const [logged, setLogged] = useState(false);
  const [planApproved, setPlanApproved] = useState(false);

  /* Location is grabbed immediately — before anything else is asked of the driver. */
  useEffect(() => {
    let alive = true;
    void getBreakdownProvider()
      .locate()
      .then((f) => {
        if (alive) setFix(f);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!fix) return;
    let alive = true;
    setLoading(true);
    void getBreakdownProvider()
      .search({ problem, fix })
      .then((r) => {
        if (!alive) return;
        setResults(r);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fix, problem]);

  const readLocation = useCallback(() => {
    if (!fix) return;
    toast.info("HERCULES is reading your location aloud", {
      description: spokenLocation(fix),
    });
  }, [fix]);

  /* Read it back the moment the fix lands — the driver may be in the dark. */
  useEffect(() => {
    if (fix) readLocation();
  }, [fix, readLocation]);

  const activeProblem = problems.find((p) => p.id === problem)!;

  const counts = useMemo(
    () => ({
      mobile: results.filter((r) => r.kind === "mobile").length,
      open24: results.filter((r) => r.open24).length,
    }),
    [results],
  );

  return (
    <AppShell
      title="Breakdown Assist"
      subtitle="HERCULES finds and ranks the help. You decide who gets called."
    >
      {/* --------------------------------- MECHANIC ETA TIMER (running clock) */}
      {tracked ? (
        <Panel
          className={
            tracked.status === "overdue"
              ? "mb-3 border-destructive/60"
              : "mb-3 border-primary/50"
          }
        >
          <PanelTitle
            right={
              <Pill tone={tracked.status === "overdue" ? "alert" : "primary"}>
                {tracked.status === "overdue" ? "past window" : countdownLabel(tracked, now)}
              </Pill>
            }
          >
            {tracked.who} · {tracked.org}
          </PanelTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Coming for {tracked.what}. Quoted {tracked.quotedMin ?? "—"} minutes — HERCULES started
            this timer for you, and calls out the countdown out loud.
          </p>
          <p
            className={`metric mt-2 text-4xl font-bold ${
              tracked.status === "overdue" ? "text-destructive" : "text-primary"
            }`}
          >
            {countdownLabel(tracked, now)}
          </p>
          <div className="mt-3">
            <Label>What did they quote you on the call?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[20, 30, 45, 60, 90, 120].map((m) => (
                <Button
                  key={m}
                  size="lg"
                  variant={tracked.quotedMin === m ? "default" : "outline"}
                  className="h-14 min-w-[6rem]"
                  onClick={() => {
                    setQuote(tracked.id, m);
                    announce(
                      `Got it — ${m} minutes for ${tracked.who} at ${tracked.org}. Timer running. I'll check in with you five minutes before it's up.`,
                    );
                  }}
                >
                  {m} min
                </Button>
              ))}
              <Button
                size="lg"
                variant="outline"
                className="h-14 gap-2"
                onClick={() => say("He said about an hour")}
              >
                <Volume2 className="h-5 w-5" /> Just tell HERCULES
              </Button>
            </div>
          </div>
          {tracked.status === "overdue" ? (
            <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm">
                The window they gave you is gone and nobody has shown up. Call them again, or have
                HERCULES rank the next provider.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tracked.phone ? (
                  <a href={`tel:${tracked.phone.replace(/[^0-9]/g, "")}`}>
                    <Button size="lg" className="h-14 gap-2">
                      <Phone className="h-5 w-5" /> Call {tracked.org} again
                    </Button>
                  </a>
                ) : null}
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14"
                  onClick={() => say("Find me another mechanic, they never showed")}
                >
                  Find someone else
                </Button>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="lg" variant="secondary" className="h-14" onClick={() => markArrived(tracked.id)}>
              <Check className="mr-2 h-5 w-5" /> They showed up
            </Button>
            <Button size="lg" variant="ghost" className="h-14" onClick={() => dismiss(tracked.id)}>
              <X className="mr-2 h-5 w-5" /> Stop the timer
            </Button>
          </div>
          <DriverApprovedNote>
            HERCULES watches the clock and tells you. It does not call anyone or re-dispatch
            anything without your word.
          </DriverApprovedNote>
        </Panel>
      ) : null}

      <div className="grid items-start gap-3 xl:grid-cols-3">
        {/* ------------------------------------------------ WHERE YOU ARE */}
        <Panel className="xl:col-span-2 border-destructive/40">
          <PanelTitle
            right={
              <Pill tone="alert">
                <MapPin className="h-3.5 w-3.5" /> GPS fix{" "}
                {fix ? `± ${fix.accuracyFt} ft` : "acquiring"}
              </Pill>
            }
          >
            Where You Are Right Now
          </PanelTitle>

          {!fix ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Grabbing your position…
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { l: "Highway", v: fix.highway },
                  { l: "Mile marker", v: fix.mileMarker },
                  { l: "Direction of travel", v: fix.direction },
                  { l: "Nearest exit", v: fix.nearestExit },
                  { l: "County / state", v: `${fix.county}, ${fix.state}` },
                  { l: "Coordinates", v: `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}` },
                ].map((r) => (
                  <div key={r.l} className="rounded-lg border border-border bg-card/60 p-3">
                    <Label>{r.l}</Label>
                    <p className="metric mt-0.5 text-xl font-bold leading-tight">{r.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="lg" variant="outline" className="gap-2" onClick={readLocation}>
                  <Volume2 className="h-5 w-5" /> Read my location aloud again
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => say("I'm broke down")}
                >
                  <LifeBuoy className="h-5 w-5" /> Hands-free · talk it through
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Relay it exactly like that: {fix.highway} {fix.direction.toLowerCase()},{" "}
                {fix.mileMarker}, {fix.county}.
              </p>
            </>
          )}
        </Panel>

        {/* ------------------------------------------------ SAFE SHOULDER */}
        <Panel className={shoulderGuidance.dangerous ? "border-warn/50" : undefined}>
          <PanelTitle
            right={
              shoulderGuidance.dangerous ? (
                <Pill tone="alert">
                  <AlertTriangle className="h-3.5 w-3.5" /> Known bad stretch
                </Pill>
              ) : (
                <Pill tone="go">Normal shoulder</Pill>
              )
            }
          >
            Get Safe First
          </PanelTitle>
          {shoulderGuidance.dangerous ? (
            <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm leading-snug">
              {shoulderGuidance.why}
            </p>
          ) : null}
          {fix ? (
            <p className="mb-3 text-sm text-muted-foreground">{fix.shoulder}</p>
          ) : null}
          <ol className="space-y-2">
            {shoulderGuidance.steps.map((s, i) => (
              <li key={s} className="flex gap-3 rounded-lg border border-border bg-card/60 p-3">
                <Triangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span className="text-sm leading-snug">
                  <span className="metric mr-1.5 font-bold text-warn">{i + 1}</span>
                  {s}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* ------------------------------------------------ PROBLEM FILTER */}
      <Panel className="mt-3">
        <PanelTitle
          right={
            <Pill tone="primary">
              {results.length} within reach · {counts.mobile} come to you · {counts.open24} open 24h
            </Pill>
          }
        >
          What's Wrong
        </PanelTitle>
        <div className="flex flex-wrap gap-2">
          {problems.map((p) => (
            <Button
              key={p.id}
              size="lg"
              variant={p.id === problem ? "default" : "outline"}
              className="h-14 min-w-[9rem] justify-center text-base"
              onClick={() => setProblem(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Or just say it — “blown tire”, “won't start”, “air leak”, “DEF light”. {activeProblem.spoken}
        </p>
      </Panel>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-3">
        {/* ------------------------------------------------ RANKED HELP */}
        <div className="space-y-3 xl:col-span-2">
          {loading ? (
            <Panel>
              <div className="flex items-center gap-3 py-6 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" /> Ranking heavy-duty help
                near {fix?.mileMarker ?? "you"}…
              </div>
            </Panel>
          ) : (
            results.map((s, i) => (
              <Panel key={s.id} className={i === 0 ? "border-primary/50" : undefined}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {i === 0 ? <Pill tone="primary">Best bet</Pill> : null}
                      <Pill tone={s.kind === "mobile" ? "go" : "neutral"}>
                        <Wrench className="h-3.5 w-3.5" /> {kindLabel(s.kind)}
                      </Pill>
                      {s.open24 ? <Pill tone="go">24 hours</Pill> : <Pill tone="watch">{s.hours}</Pill>}
                    </div>
                    <h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide">
                      {s.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Services:{" "}
                      {s.services
                        .map((id) => problems.find((p) => p.id === id)?.label ?? id)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.rating.toFixed(1)} ★ · {s.reviews} driver reviews
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="metric text-3xl font-bold text-primary">{s.etaMin}<span className="ml-1 text-sm uppercase tracking-wider opacity-70">min</span></div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {s.kind === "mobile" || s.kind === "tow" ? "to reach you" : "drive time"}
                    </p>
                    <p className="mt-1 text-sm">{s.milesAway.toFixed(1)} mi away</p>
                    <p className="metric mt-1 text-sm">{s.phone}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="lg" className="h-14 gap-2 text-base" onClick={() => setConfirm(s)}>
                    <Phone className="h-5 w-5" /> Call {s.name.split(" ")[0]}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 gap-2 text-base"
                    onClick={() =>
                      toast.info("HERCULES is reading this shop aloud", {
                        description: spokenService(s),
                      })
                    }
                  >
                    <Volume2 className="h-5 w-5" /> Read it to me
                  </Button>
                </div>
              </Panel>
            ))
          )}
          {!loading && results.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted-foreground">
                Nobody in range handles that specifically. Say “not sure yet” and I'll show every
                heavy-duty option, tow included.
              </p>
            </Panel>
          ) : null}
        </div>

        {/* ------------------------------------------------ FAULT CODES + DAY REBUILD */}
        <div className="space-y-3">
          <Panel>
            <PanelTitle right={<Pill tone="alert">{boltFaults.length} active</Pill>}>
              Live Fault Codes
            </PanelTitle>
            <p className="mb-2 text-xs text-muted-foreground">
              Straight off the ECM, so you can describe it accurately on the phone.
            </p>
            <div className="space-y-2">
              {boltFaults.map((f) => (
                <div
                  key={f.code}
                  className={
                    "rounded-lg border p-3 " +
                    (f.severity === "alert"
                      ? "border-destructive/45 bg-destructive/10"
                      : "border-warn/45 bg-warn/10")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="metric font-bold">{f.code}</span>
                    <Pill tone={f.severity === "alert" ? "alert" : "watch"}>{f.system}</Pill>
                  </div>
                  <p className="mt-1 text-sm leading-snug">{f.plain}</p>
                </div>
              ))}
            </div>
            <Button
              size="lg"
              variant="outline"
              className="mt-3 h-14 w-full gap-2"
              onClick={() =>
                toast.info("HERCULES is reading your fault codes aloud", {
                  description: boltFaults
                    .map((f) => `${f.code} on the ${f.system.toLowerCase()}. ${f.plain}`)
                    .join(" "),
                })
              }
            >
              <Volume2 className="h-5 w-5" /> Read my codes aloud
            </Button>
            <Button asChild size="lg" variant="secondary" className="mt-2 h-14 w-full gap-2">
              <Link to="/parts">
                <Wrench className="h-5 w-5" /> Source the part for these codes
              </Link>
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Part and mechanic in one flow — HERCULES prices the part, shows the service fee, and
              waits for your yes on both.
            </p>
            <Link
              to="/health"
              className="mt-2 block text-center text-xs uppercase tracking-wider text-primary"
            >
              Full truck health
            </Link>
          </Panel>

          <Panel className={logged ? "border-primary/50" : undefined}>
            <PanelTitle
              right={
                <Pill tone={planApproved ? "go" : logged ? "warn" : "neutral"}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {planApproved ? "Applied" : logged ? "Proposed" : "Not logged"}
                </Pill>
              }
            >
              Load Reset
            </PanelTitle>
            {!logged ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Logging the breakdown rebuilds the day — hours, ETA on {currentLoad.destination},
                  load impact, parking, and rest. Nothing changes until you approve the plan.
                </p>
                <Button
                  size="lg"
                  variant="destructive"
                  className="mt-3 h-14 w-full gap-2"
                  onClick={() => {
                    setLogged(true);
                    toast.warning("Breakdown logged — day recalculated", {
                      description: "Proposed plan below. Nothing is applied until you approve it.",
                    });
                  }}
                >
                  <Stethoscope className="h-5 w-5" /> Log this breakdown
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                {breakdownResetPlan.map((p) => (
                  <div key={p.label} className="rounded-lg border border-border bg-card/70 p-3">
                    <Label>{p.label}</Label>
                    <p className="text-sm leading-snug">{p.detail}</p>
                  </div>
                ))}
                {!planApproved ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="lg"
                      className="h-14 flex-1 gap-2"
                      onClick={() => {
                        setPlanApproved(true);
                        toast.success("Day rebuilt on your approval", {
                          description: "You can override any part of it.",
                        });
                      }}
                    >
                      <Check className="h-5 w-5" /> Approve this plan
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-14 gap-2"
                      onClick={() => setLogged(false)}
                    >
                      <X className="h-5 w-5" /> Keep my plan
                    </Button>
                  </div>
                ) : (
                  <Pill tone="go">
                    <Check className="h-3.5 w-3.5" /> Approved by you
                  </Pill>
                )}
                <DriverApprovedNote />
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------------ CALL CONFIRMATION */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl uppercase">Place this call?</DialogTitle>
            <DialogDescription>
              HERCULES reads the shop back to you first. Nothing is dispatched, ordered, or paid for
              until you say so on the phone.
            </DialogDescription>
          </DialogHeader>
          {confirm ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-card/70 p-3">
                <Label>{kindLabel(confirm.kind)}</Label>
                <p className="font-display text-lg font-semibold uppercase tracking-wide">
                  {confirm.name}
                </p>
                <p className="metric mt-1 text-xl font-bold text-primary">{confirm.phone}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {confirm.milesAway.toFixed(1)} mi · {confirm.etaMin} min ·{" "}
                  {confirm.open24 ? "open 24 hours" : confirm.hours}
                </p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/8 p-3">
                <Label>If HERCULES pays this one for you</Label>
                <p className="text-sm leading-snug text-muted-foreground">
                  Pay the shop yourself and HERCULES charges you nothing. If you have HERCULES book
                  and pay it — roadside, parts, tires — the service fee scales with the bill and is
                  shown and read to you first: {feeBands
                    .slice(0, 3)
                    .map((b) => `${b.label} → $${b.fee.toFixed(2)}`)
                    .join(" · ")}, up to ${feeBands[feeBands.length - 1]?.fee.toFixed(2)} on the
                  largest parts orders. It is what keeps HERCULES running.
                </p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
                <Label>Read your location to them</Label>
                <p className="text-sm leading-snug">{fix ? spokenLocation(fix) : ""}</p>
              </div>
              <DriverApprovedNote>
                You are placing this call. HERCULES does not dispatch anyone or authorize any charge.
              </DriverApprovedNote>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button size="lg" variant="ghost" onClick={() => setConfirm(null)}>
              Not this one
            </Button>
            {confirm ? (
              <a href={`tel:${confirm.phone.replace(/[^0-9]/g, "")}`}>
                <Button
                  size="lg"
                  className="h-14 w-full gap-2 text-base"
                  onClick={() => {
                    toast.success(`Connecting you to ${confirm.name}`, {
                      description: "Your location is on screen — read it to them.",
                    });
                    // MECHANIC ETA TIMER: HERCULES starts its own clock from
                    // their published window right away. Whatever they quote on
                    // the call replaces it — by voice or with one tap.
                    expectMechanic({
                      company: confirm.name,
                      reason:
                        problem === "unknown"
                          ? "a breakdown you haven't pinned down yet"
                          : activeProblem.label.toLowerCase(),
                      etaMin: confirm.etaMin,
                      phone: confirm.phone,
                    });
                    setConfirm(null);
                  }}
                >
                  <Phone className="h-5 w-5" /> Yes — call now
                </Button>
              </a>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
