import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, LayoutGrid, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/hercules/ThemeToggle";
import { LoadResetButton } from "@/components/hercules/LoadReset";
import { currentLoad, hos } from "@/data/mock";
import { navSteps, routePath } from "@/data/navigation";
import { hm } from "@/components/hercules/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HERCULES — Voice-First Driver OS" },
      {
        name: "description",
        content:
          "The HERCULES orb: a night-safe, voice-first home screen with ghosted turn-by-turn route, next turn, ETA, miles, and hours of service.",
      },
      { property: "og:title", content: "HERCULES — Voice-First Driver OS" },
      {
        property: "og:description",
        content: "Speak to it. It answers. Nothing commits without your approval.",
      },
    ],
  }),
  component: OrbHome,
});

type OrbState = "idle" | "listening" | "speaking";

const replies = [
  "You have 214 miles to Oklahoma City. ETA 19:42, with 1 hour 48 minutes of slack in the window.",
  "Next turn is in four tenths — merge right onto I-44 East. Keep right, two lanes.",
  "You have 4 hours 6 minutes of drive time left. Your own pattern says you fade around 16:30. I can suggest a stop — your call.",
];

function OrbHome() {
  const { account, trialDaysLeft } = useAuth();
  const [state, setState] = useState<OrbState>("idle");
  const [line, setLine] = useState<string>("Say “Hercules” or tap the orb");
  const [replyIdx, setReplyIdx] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function wake() {
    if (state !== "idle") {
      setState("idle");
      setLine("Say “Hercules” or tap the orb");
      return;
    }
    setState("listening");
    setLine("Listening…");
    timers.current.push(
      setTimeout(() => {
        setState("speaking");
        setLine(replies[replyIdx % replies.length]!);
        setReplyIdx((i) => i + 1);
        timers.current.push(
          setTimeout(() => {
            setState("idle");
            setLine("Say “Hercules” or tap the orb");
          }, 6000),
        );
      }, 1800),
    );
  }

  const step = navSteps[0]!;
  const active = state !== "idle";

  return (
    <main className="orb-canvas relative min-h-screen overflow-hidden">
      {/* Ghosted turn-by-turn route — readable, never bright */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.3]"
      >
        <path
          d={routePath}
          fill="none"
          stroke="var(--orb-halo)"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d={routePath}
          fill="none"
          stroke="var(--orb-core)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 14"
          className="route-flow"
        />
        {[
          [128, 258],
          [206, 146],
          [306, 44],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="var(--orb-core)" opacity="0.5" />
        ))}
      </svg>

      {/* Top edge readouts */}
      <div className="relative z-10 flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Hercules
          </div>
          <div className="label-cap mt-1">Next turn in {step.in}</div>
          <div className="mt-0.5 max-w-[22ch] text-sm text-foreground/70 sm:text-base">
            {step.text}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" className="bg-transparent" />
          <Link
            to="/dashboard"
            aria-label="Open full dashboard"
            className="flex h-9 items-center gap-2 rounded-full border border-border px-3 font-display text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutGrid className="h-4 w-4" /> Panels
          </Link>
        </div>
      </div>

      {/* The orb */}
      <div className="relative z-10 flex min-h-[62vh] items-center justify-center px-4">
        <button
          type="button"
          onClick={wake}
          aria-label={active ? "Stop Hercules" : "Wake Hercules"}
          aria-pressed={active}
          className="group relative flex h-[min(66vw,340px)] w-[min(66vw,340px)] items-center justify-center rounded-full"
        >
          {active ? (
            <>
              <span className="orb-ripple absolute inset-0 rounded-full border border-[var(--orb-core)]/40" />
              <span
                className="orb-ripple absolute inset-0 rounded-full border border-[var(--orb-core)]/25"
                style={{ animationDelay: "1.2s" }}
              />
            </>
          ) : null}
          <span
            className={cn(
              "orb-core absolute inset-0 rounded-full",
              active ? "orb-active" : "orb-idle",
            )}
          />
          <span className="orb-swirl absolute inset-6 rounded-full border border-[var(--orb-core)]/15" />
          <span className="relative flex flex-col items-center gap-2">
            <Mic
              className={cn(
                "h-10 w-10 transition-opacity",
                active ? "text-[var(--orb-core)] opacity-90" : "text-[var(--orb-core)] opacity-40",
              )}
            />
            <span className="font-display text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
              {state === "listening" ? "Listening" : state === "speaking" ? "Speaking" : "Idle"}
            </span>
          </span>
        </button>
      </div>

      {/* Spoken line */}
      <p className="relative z-10 mx-auto max-w-2xl px-6 text-center text-sm leading-relaxed text-foreground/65 sm:text-base">
        {line}
      </p>

      {/* Bottom edge readouts */}
      <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 px-5 pb-6 sm:grid-cols-4">
        <Readout label="Miles left" value={String(currentLoad.milesRemaining)} unit="mi" />
        <Readout label="ETA" value={currentLoad.etaLocal} />
        <Readout label="Drive left" value={hm(hos.driveRemainingMin)} />
        <Readout label="Break in" value={hm(hos.breakInMin)} />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-5 pb-8">
        <p className="text-xs text-muted-foreground">
          Hercules proposes. You decide. Nothing books without your word.
        </p>
        <div className="flex items-center gap-2">
          <LoadResetButton className="h-10" />
          {account ? (
            <Link
              to="/settings"
              className="font-display text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              {account.status === "trial" ? `Trial · ${trialDaysLeft}d` : "Account"}
              <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              to="/sign-in"
              className="font-display text-[0.68rem] uppercase tracking-[0.14em] text-primary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Readout({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="label-cap">{label}</div>
      <div className="metric mt-0.5 text-2xl font-bold text-foreground/80">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal opacity-60">{unit}</span> : null}
      </div>
    </div>
  );
}
