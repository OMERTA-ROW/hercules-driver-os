import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Gauge,
  Wrench,
  CircleDot,
  Zap,
  ZapOff,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/hercules/AppShell";
import { Panel, PanelTitle, Label, Metric, Pill, Bar, DriverApprovedNote } from "@/components/hercules/primitives";
import { Button } from "@/components/ui/button";
import { driver } from "@/data/mock";
import { BOLT, boltPairingSteps } from "@/data/bolt";
import { useBolt } from "@/lib/bolt";
import { usePurchases } from "@/lib/purchases";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Truck Health — live engine diagnostics from THE BOLT" },
      {
        name: "description",
        content:
          "THE BOLT streams live J1939 engine data to HERCULES: fault codes in plain English, fuel economy, engine hours, temps, DEF, tire pressure, brake wear and predictive maintenance.",
      },
      { property: "og:title", content: "Truck Health — live engine diagnostics" },
      {
        property: "og:description",
        content:
          "Automated monitoring over Bluetooth. HERCULES speaks up on its own when the engine needs attention.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HealthPage,
});

const tone = (s: "ok" | "watch" | "alert") =>
  s === "ok" ? ("go" as const) : s === "watch" ? ("warn" as const) : ("alert" as const);

function BoltStatus() {
  const { state, signal, startPairing, disconnect } = useBolt();
  const { owns } = usePurchases();
  const hasBolt = owns("bolt");
  const connected = state === "connected";

  return (
    <Panel>
      <PanelTitle
        right={
          <Pill tone={connected ? "go" : state === "pairing" ? "watch" : "alert"}>
            {connected ? <Zap className="h-3.5 w-3.5" /> : <ZapOff className="h-3.5 w-3.5" />}
            {connected
              ? "Connected"
              : state === "pairing"
                ? "Pairing"
                : state === "paired"
                  ? "Paired"
                  : "Not detected"}
          </Pill>
        }
      >
        THE BOLT
      </PanelTitle>

      <div className="flex items-center gap-3">
        <Zap
          className={
            "h-12 w-12 shrink-0 " +
            (connected
              ? "text-primary drop-shadow-[0_0_16px_var(--primary)]"
              : "text-muted-foreground")
          }
        />
        <div className="min-w-0">
          <Label>{BOLT.tagline}</Label>
          <p className="text-sm text-muted-foreground">
            {connected
              ? `Bluetooth signal ${signal}/4 · streaming J1939 from the nine-pin port`
              : hasBolt
                ? "Plug into the nine-pin port and pair to start the live stream."
                : `${BOLT.name} is a one-time purchase in the store — ${BOLT.priceLabel}.`}
          </p>
        </div>
      </div>

      {connected ? (
        <Button variant="outline" size="lg" className="mt-3 w-full" onClick={disconnect}>
          Disconnect THE BOLT
        </Button>
      ) : hasBolt ? (
        <>
          <ol className="mt-3 space-y-2">
            {boltPairingSteps.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="font-display text-sm uppercase tracking-[0.12em] text-primary">
                  {i + 1}. {s.title}
                </div>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
          <Button
            size="lg"
            className="mt-3 w-full"
            disabled={state === "pairing"}
            onClick={() => void startPairing()}
          >
            {state === "pairing" ? "Looking for THE BOLT…" : "Pair over Bluetooth"}
          </Button>
        </>
      ) : (
        <Button asChild size="lg" className="mt-3 w-full">
          <Link to="/store">Get THE BOLT — {BOLT.priceLabel} one time</Link>
        </Button>
      )}
    </Panel>
  );
}

function HealthPage() {
  const { state, snapshot, autoAlerts, dismissAlert } = useBolt();
  const { values, faults, tires, predictions } = snapshot;
  const connected = state === "connected";
  const flagged = values.filter((v) => v.status !== "ok").length + faults.length;

  return (
    <AppShell
      title="Truck Health"
      subtitle={`${driver.truck} · ${driver.unit} · ${connected ? "THE BOLT live stream" : "last sync"}`}
    >
      {autoAlerts.length ? (
        <div className="mb-3 space-y-2">
          {autoAlerts.map((a) => (
            <div
              key={a.id}
              className={
                "flex items-start gap-3 rounded-lg border p-3 " +
                (a.severity === "alert"
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-warn/45 bg-warn/10")
              }
            >
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <Label>HERCULES spoke up on its own</Label>
                <p className="text-sm leading-snug">{a.spoken}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismissAlert(a.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hairline"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelTitle
            right={
              <Pill tone={flagged ? "warn" : "go"}>
                <Gauge className="h-3.5 w-3.5" /> {flagged} items flagged
              </Pill>
            }
          >
            Live Stream
          </PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {values.map((m) => (
              <div key={m.key} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Label>{m.label}</Label>
                  {m.status !== "ok" ? (
                    <AlertTriangle
                      className={
                        "h-4 w-4 " + (m.status === "watch" ? "text-warn" : "text-destructive")
                      }
                    />
                  ) : null}
                </div>
                <Metric value={m.value} unit={m.unit} tone={tone(m.status)} className="mt-1" />
                {typeof m.pct === "number" ? (
                  <Bar className="mt-2" pct={m.pct} tone={tone(m.status)} />
                ) : null}
                <p className="mt-2 text-xs leading-snug text-muted-foreground">{m.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <BoltStatus />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelTitle right={<Pill tone="alert">{faults.length} active</Pill>}>
            Fault Codes
          </PanelTitle>
          <div className="space-y-2">
            {faults.map((f) => (
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
                <p className="mt-1 text-sm">{f.plain}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  First seen {f.firstSeen} · {f.occurrences}×
                </p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="lg"
            className="mt-3 w-full"
            onClick={() =>
              toast.info("HERCULES is reading your codes aloud", {
                description: faults.map((f) => f.plain).join(" "),
              })
            }
          >
            <Volume2 className="mr-2 h-4 w-4" /> Read these aloud in plain English
          </Button>
          <div className="mt-2">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/breakdown">Take these codes to Breakdown Assist</Link>
            </Button>
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="watch">TPMS</Pill>}>Tire Pressure</PanelTitle>
          <div className="grid gap-2">
            {tires.map((t) => (
              <div
                key={t.pos}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <CircleDot
                    className={
                      "h-4 w-4 " +
                      (t.status === "ok"
                        ? "text-go"
                        : t.status === "watch"
                          ? "text-warn"
                          : "text-destructive")
                    }
                  />
                  <span className="text-sm">{t.pos}</span>
                </div>
                <div className="text-right">
                  <span
                    className={
                      "metric text-lg font-bold " +
                      (t.status === "ok"
                        ? "text-foreground"
                        : t.status === "watch"
                          ? "text-warn"
                          : "text-destructive")
                    }
                  >
                    {t.psi}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">/ {t.target} psi</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelTitle right={<Pill tone="info">Suggestions only</Pill>}>
            Predictive Maintenance
          </PanelTitle>
          <div className="space-y-2">
            {predictions.map((p) => (
              <div key={p.title} className="rounded-lg border border-info/35 bg-info/8 p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-base">{p.title}</span>
                  <Pill tone="info">{p.confidence}% match</Pill>
                </div>
                <p className="mt-1 text-sm">{p.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill tone="watch">
                    <Wrench className="h-3.5 w-3.5" /> {p.window}
                  </Pill>
                  <Button size="sm" variant="outline">
                    Schedule on my terms
                  </Button>
                  <Button size="sm" variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <DriverApprovedNote>
              HERCULES watches the stream and tells you what it sees. No service is booked and no
              money is spent without your say-so.
            </DriverApprovedNote>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
