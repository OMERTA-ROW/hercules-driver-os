import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * THE ORB — the whole interface.
 *
 * A sphere of liquid metal. No ring, no cord, no encircling band: just the
 * sphere, with slow internal currents, swirling gradients, rolling caustic
 * highlights and gold shimmer moving through the dark like molten metal.
 *
 * The surface is a stack of soft light/gold blobs clipped to the sphere and
 * pushed through an animated turbulence displacement filter, so the motion is
 * organic and never repeats visibly. Three colorways (black / grey / white),
 * gold in all of them. Three states, all expressed through the liquid:
 *   idle      — slow lazy churn and a gentle breathe
 *   listening — the DRIVER is talking: the surface agitates, quick ripples
 *   speaking  — HERCULES is talking: stronger waves pulsing out from center
 */

const shells: Record<
  OrbColorway,
  { top: string; mid: string; deep: string; rim: string; sheen: string }
> = {
  black: {
    top: "oklch(0.3 0.014 250)",
    mid: "oklch(0.13 0.008 250)",
    deep: "oklch(0.04 0.004 250)",
    rim: "oklch(0.44 0.02 250)",
    sheen: "oklch(0.72 0.02 250)",
  },
  grey: {
    top: "oklch(0.66 0.008 250)",
    mid: "oklch(0.38 0.008 250)",
    deep: "oklch(0.17 0.006 250)",
    rim: "oklch(0.76 0.008 250)",
    sheen: "oklch(0.9 0.006 250)",
  },
  white: {
    top: "oklch(0.99 0.004 90)",
    mid: "oklch(0.87 0.008 90)",
    deep: "oklch(0.58 0.014 90)",
    rim: "oklch(1 0 0)",
    sheen: "oklch(1 0 0)",
  },
};

const GOLD = "oklch(0.8 0.13 84)";
const GOLD_DEEP = "oklch(0.58 0.11 74)";

export function Orb({
  className,
  mode,
  colorway,
  onActivate,
}: {
  className?: string | undefined;
  mode: VoiceMode;
  colorway: OrbColorway;
  onActivate?: () => void;
}) {
  const s = shells[colorway];
  const listening = mode === "listening";
  const speaking = mode === "speaking";
  const uid = `orb-${colorway}`;

  /* Turbulence churn: lazy when idle, agitated on input, big slow swell on output. */
  const churn = listening
    ? { freq: "0.011;0.019;0.013;0.011", dur: "3.4s", scale: "26;38;26" }
    : speaking
      ? { freq: "0.007;0.012;0.008;0.007", dur: "4.6s", scale: "34;54;34" }
      : { freq: "0.006;0.009;0.007;0.006", dur: "16s", scale: "20;28;20" };

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
        className="orb-bloom absolute -inset-[16%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${GOLD} ${speaking ? 20 : listening ? 15 : 8}%, transparent) 0%, transparent 66%)`,
        }}
      />

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
          {/* Liquid displacement — the whole reason this reads as fluid. */}
          <filter
            id={`${uid}-liquid`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.007"
              numOctaves={3}
              seed={11}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values={churn.freq}
                dur={churn.dur}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="24"
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                values={churn.scale}
                dur={churn.dur}
                repeatCount="indefinite"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="1.6" />
          </filter>

          <radialGradient id={`${uid}-shell`} cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor={s.top} />
            <stop offset="52%" stopColor={s.mid} />
            <stop offset="100%" stopColor={s.deep} />
          </radialGradient>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.rim} stopOpacity="0.8" />
            <stop offset="58%" stopColor={s.rim} stopOpacity="0.04" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.4" />
          </linearGradient>

          {/* Molten gold current */}
          <radialGradient id={`${uid}-molten`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.85" />
            <stop offset="55%" stopColor={GOLD_DEEP} stopOpacity="0.35" />
            <stop offset="100%" stopColor={GOLD_DEEP} stopOpacity="0" />
          </radialGradient>
          {/* Cool sheen current — the wet-looking light rolling over the surface */}
          <radialGradient id={`${uid}-sheen`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={s.sheen} stopOpacity="0.5" />
            <stop offset="60%" stopColor={s.sheen} stopOpacity="0.14" />
            <stop offset="100%" stopColor={s.sheen} stopOpacity="0" />
          </radialGradient>
          {/* Caustic streak — a thin bright band of refracted light */}
          <linearGradient id={`${uid}-caustic`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="45%" stopColor={GOLD} stopOpacity="0.7" />
            <stop offset="55%" stopColor={s.sheen} stopOpacity="0.55" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}-gloss`} cx="33%" cy="22%" r="40%">
            <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(1 0 0)" stopOpacity="0" />
          </radialGradient>

          <clipPath id={`${uid}-sphere`}>
            <circle cx="200" cy="200" r="150" />
          </clipPath>
        </defs>

        {/* Base body of liquid */}
        <circle cx="200" cy="200" r="150" fill={`url(#${uid}-shell)`} />

        {/* Internal currents — displaced into liquid, clipped to the sphere */}
        <g clipPath={`url(#${uid}-sphere)`}>
          <g filter={`url(#${uid}-liquid)`}>
            {/* Slow swirling gold currents at different depths and speeds */}
            <g className="orb-flow-a">
              <ellipse cx="150" cy="170" rx="118" ry="96" fill={`url(#${uid}-molten)`} />
            </g>
            <g className="orb-flow-b">
              <ellipse cx="258" cy="248" rx="104" ry="118" fill={`url(#${uid}-molten)`} />
            </g>
            <g className="orb-flow-c">
              <ellipse cx="196" cy="146" rx="132" ry="86" fill={`url(#${uid}-sheen)`} />
            </g>
            <g className="orb-flow-d">
              <ellipse cx="188" cy="270" rx="96" ry="72" fill={`url(#${uid}-sheen)`} />
            </g>
            {/* Caustic light rolling across the wet surface */}
            <g className="orb-caustic">
              <rect
                x="20"
                y="150"
                width="360"
                height="34"
                rx="17"
                fill={`url(#${uid}-caustic)`}
              />
            </g>
            <g className="orb-caustic-slow">
              <rect
                x="20"
                y="236"
                width="360"
                height="22"
                rx="11"
                fill={`url(#${uid}-caustic)`}
                opacity="0.7"
              />
            </g>
          </g>

          {/* Waves radiating from the center of the liquid when HERCULES talks */}
          {speaking ? (
            <g className="orb-wave-group">
              <circle
                cx="200"
                cy="200"
                r="60"
                fill="none"
                stroke={GOLD}
                strokeWidth="10"
                className="orb-wave"
              />
              <circle
                cx="200"
                cy="200"
                r="60"
                fill="none"
                stroke={GOLD}
                strokeWidth="7"
                className="orb-wave"
                style={{ animationDelay: "-1.1s" }}
              />
              <circle
                cx="200"
                cy="200"
                r="60"
                fill="none"
                stroke={GOLD}
                strokeWidth="5"
                className="orb-wave"
                style={{ animationDelay: "-2.2s" }}
              />
            </g>
          ) : null}

          {/* Surface agitation when the driver is talking */}
          {listening ? (
            <g className="orb-agitate">
              <ellipse
                cx="200"
                cy="212"
                rx="128"
                ry="30"
                fill="none"
                stroke={GOLD}
                strokeWidth="3"
                opacity="0.5"
                className="orb-agitate-line"
              />
              <ellipse
                cx="200"
                cy="176"
                rx="112"
                ry="24"
                fill="none"
                stroke={GOLD}
                strokeWidth="2"
                opacity="0.38"
                className="orb-agitate-line"
                style={{ animationDelay: "-0.45s" }}
              />
              <ellipse
                cx="200"
                cy="248"
                rx="104"
                ry="20"
                fill="none"
                stroke={GOLD}
                strokeWidth="2"
                opacity="0.3"
                className="orb-agitate-line"
                style={{ animationDelay: "-0.9s" }}
              />
            </g>
          ) : null}

          {/* Wet gloss on top of everything inside the sphere */}
          <circle
            cx="200"
            cy="200"
            r="150"
            fill={`url(#${uid}-gloss)`}
            className="orb-gloss"
          />
        </g>

        {/* Meniscus edge */}
        <circle
          cx="200"
          cy="200"
          r="150"
          fill="none"
          stroke={`url(#${uid}-rim)`}
          strokeWidth="2"
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
export function LiveOrb({ className }: { className?: string | undefined }) {
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
