import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * THE ORB — the whole interface.
 *
 * A machined sphere with gold filament detailing and a cord/ring that threads
 * through it. A continuous ripple travels along that cord at all times, so the
 * orb reads as alive from the corner of the driver's eye.
 *
 * Three colorways (black / grey / white), gold accent in all of them, picked in
 * settings. Three states:
 *   idle      — slow breathe, single slow ripple on the cord
 *   listening — the DRIVER is talking: tight inward rings reacting to input
 *   speaking  — HERCULES is talking: gold waveform bands radiating outward
 */

const shells: Record<
  OrbColorway,
  { top: string; mid: string; deep: string; rim: string; cord: string }
> = {
  black: {
    top: "oklch(0.28 0.012 250)",
    mid: "oklch(0.14 0.008 250)",
    deep: "oklch(0.05 0.004 250)",
    rim: "oklch(0.42 0.02 250)",
    cord: "oklch(0.1 0.006 250)",
  },
  grey: {
    top: "oklch(0.62 0.008 250)",
    mid: "oklch(0.4 0.008 250)",
    deep: "oklch(0.2 0.006 250)",
    rim: "oklch(0.72 0.008 250)",
    cord: "oklch(0.26 0.006 250)",
  },
  white: {
    top: "oklch(0.98 0.004 90)",
    mid: "oklch(0.88 0.006 90)",
    deep: "oklch(0.62 0.01 90)",
    rim: "oklch(1 0 0)",
    cord: "oklch(0.72 0.01 90)",
  },
};

const GOLD = "oklch(0.8 0.13 84)";
const GOLD_DIM = "oklch(0.62 0.1 84)";

export function Orb({
  className,
  mode,
  colorway,
  onActivate,
}: {
  className?: string;
  mode: VoiceMode;
  colorway: OrbColorway;
  onActivate?: () => void;
}) {
  const s = shells[colorway];
  const listening = mode === "listening";
  const speaking = mode === "speaking";
  const uid = `orb-${colorway}`;

  const body = (
    <span
      className={cn(
        "relative block aspect-square w-full",
        listening && "orb-state-listening",
        speaking && "orb-state-speaking",
        mode === "idle" && "orb-state-idle",
      )}
    >
      {/* Ambient bloom behind the sphere */}
      <span
        aria-hidden
        className="orb-bloom absolute -inset-[18%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${GOLD} ${speaking ? 22 : listening ? 16 : 9}%, transparent) 0%, transparent 66%)`,
        }}
      />

      {/* Reactive rings — inward for the driver, outward for HERCULES */}
      {listening ? (
        <>
          <span aria-hidden className="orb-ring-in absolute inset-0 rounded-full" />
          <span
            aria-hidden
            className="orb-ring-in absolute inset-0 rounded-full"
            style={{ animationDelay: "0.7s" }}
          />
        </>
      ) : null}
      {speaking ? (
        <>
          <span aria-hidden className="orb-ring-out absolute inset-0 rounded-full" />
          <span
            aria-hidden
            className="orb-ring-out absolute inset-0 rounded-full"
            style={{ animationDelay: "0.9s" }}
          />
          <span
            aria-hidden
            className="orb-ring-out absolute inset-0 rounded-full"
            style={{ animationDelay: "1.8s" }}
          />
        </>
      ) : null}

      <svg
        viewBox="0 0 400 400"
        className="orb-body absolute inset-0 h-full w-full"
        role="img"
        aria-label={
          listening
            ? "Hercules is listening to you"
            : speaking
              ? "Hercules is speaking"
              : "Hercules orb, idle"
        }
      >
        <defs>
          <radialGradient id={`${uid}-shell`} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor={s.top} />
            <stop offset="52%" stopColor={s.mid} />
            <stop offset="100%" stopColor={s.deep} />
          </radialGradient>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.rim} stopOpacity="0.85" />
            <stop offset="60%" stopColor={s.rim} stopOpacity="0.05" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id={`${uid}-gloss`} cx="34%" cy="24%" r="42%">
            <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="oklch(1 0 0)" stopOpacity="0" />
          </radialGradient>
          {/* Cord path: threads behind the sphere and back out the front. */}
          <path
            id={`${uid}-cord`}
            d="M -10 236 C 70 196 128 300 200 300 C 272 300 330 196 410 236"
          />
          <path id={`${uid}-cord-back`} d="M -10 236 C 70 196 128 132 200 132 C 272 132 330 196 410 236" />
          <clipPath id={`${uid}-sphere`}>
            <circle cx="200" cy="200" r="150" />
          </clipPath>
        </defs>

        {/* Cord behind the sphere */}
        <use
          href={`#${uid}-cord-back`}
          fill="none"
          stroke={s.cord}
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.9"
        />
        <use
          href={`#${uid}-cord-back`}
          fill="none"
          stroke={GOLD_DIM}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Sphere */}
        <circle cx="200" cy="200" r="150" fill={`url(#${uid}-shell)`} />
        <circle
          cx="200"
          cy="200"
          r="150"
          fill="none"
          stroke={`url(#${uid}-rim)`}
          strokeWidth="2"
        />

        {/* Gold filament detailing — latitude bands and a meridian */}
        <g clipPath={`url(#${uid}-sphere)`} opacity="0.9">
          <ellipse
            cx="200"
            cy="200"
            rx="150"
            ry="44"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.4"
            opacity="0.55"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="150"
            ry="96"
            fill="none"
            stroke={GOLD}
            strokeWidth="1"
            opacity="0.28"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="52"
            ry="150"
            fill="none"
            stroke={GOLD}
            strokeWidth="1"
            opacity="0.22"
          />
          <circle cx="200" cy="200" r="150" fill={`url(#${uid}-gloss)`} />
          {/* Inner core — brightens when either side is speaking */}
          <circle
            cx="200"
            cy="200"
            r="30"
            fill={GOLD}
            className="orb-core-dot"
          />
        </g>

        {/* Cord in front of the sphere, with the travelling ripple on it */}
        <use
          href={`#${uid}-cord`}
          fill="none"
          stroke={s.cord}
          strokeWidth="17"
          strokeLinecap="round"
        />
        <use
          href={`#${uid}-cord`}
          fill="none"
          stroke={GOLD_DIM}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Continuous wave along the cord */}
        <use
          href={`#${uid}-cord`}
          fill="none"
          stroke={GOLD}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="26 190"
          className="orb-cord-wave"
        />
        <use
          href={`#${uid}-cord`}
          fill="none"
          stroke={GOLD}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="8 208"
          opacity="0.35"
          className="orb-cord-wave"
          style={{ animationDelay: "-1.4s" }}
        />
      </svg>
    </span>
  );

  if (!onActivate) return <span className={cn("block", className)}>{body}</span>;

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={listening ? "Stop listening" : "Talk to Hercules"}
      className={cn(
        "block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        className,
      )}
    >
      {body}
    </button>
  );
}

/** Convenience wrapper bound to the live voice state. */
export function LiveOrb({ className }: { className?: string }) {
  const { mode, colorway, listen, stop } = useVoice();
  return (
    <Orb
      className={className}
      mode={mode}
      colorway={colorway}
      onActivate={mode === "idle" ? listen : stop}
    />
  );
}
