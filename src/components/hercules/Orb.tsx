import { useCallback, useEffect, useRef, useState } from "react";
import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { getVoiceLevel } from "@/lib/voice-level";
import { cn } from "@/lib/utils";

/**
 * THE ORB — the whole interface.
 *
 * A body of liquid metal. No ring, no cord, nothing orbiting it: just the
 * sphere.
 *
 *   base      — slow, heavy flow. Mercury shifting under its own weight:
 *               always moving, never quick.
 *   ripples   — a touch sends a ripple out from the point of contact; speech
 *               sends them out from the centre. They overlap and decay.
 *   loudness  — ripple strength and speed track the actual voice level, so an
 *               emphatic line throws the surface and a quiet one barely
 *               disturbs it.
 *
 * Gold reads through the moving liquid throughout, with violet mixed into the
 * depths and the bloom.
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
const VIOLET = "oklch(0.58 0.19 300)";

type Ripple = {
  id: number;
  cx: number;
  cy: number;
  /** 0 to 1 — how hard the surface was hit. */
  strength: number;
  /** Seconds for the ripple to cross the surface and die out. */
  dur: number;
};

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

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seq = useRef(0);
  const bloom = useRef<HTMLSpanElement | null>(null);

  /* One disturbance of the surface. Ripples are independent and short-lived,
     so several can be travelling at once and decay on their own schedule. */
  const ripple = useCallback((cx: number, cy: number, strength: number) => {
    const st = Math.max(0.08, Math.min(1, strength));
    const id = (seq.current += 1);
    // Harder hits travel faster; a quiet one drifts out and fades.
    const dur = 3.4 - st * 1.7;
    setRipples((prev) => [...prev.slice(-7), { id, cx, cy, strength: st, dur }]);
    setTimeout(
      () => setRipples((prev) => prev.filter((r) => r.id !== id)),
      dur * 1000 + 150,
    );
  }, []);

  /* Voice-driven ripples out of the centre. The gap between them and their
     force both come off the live level, so the surface reads the delivery. */
  useEffect(() => {
    if (mode === "idle") return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (!alive) return;
      const level = getVoiceLevel();
      if (level > 0.05) ripple(200, 200, (speaking ? 0.3 : 0.18) + level * 0.8);
      timer = setTimeout(loop, 240 + (1 - Math.min(1, level)) * 900);
    };
    timer = setTimeout(loop, 140);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mode, speaking, ripple]);

  /* The glow behind the liquid breathes with the voice too. */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = bloom.current;
      if (el) {
        const level = mode === "idle" ? 0 : getVoiceLevel();
        el.style.opacity = String(0.5 + level * 0.5);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  /* A touch disturbs the liquid where the finger lands. */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (!box.width) return;
      const x = ((e.clientX - box.left) / box.width) * 400;
      const y = ((e.clientY - box.top) / box.height) * 400;
      ripple(x, y, 0.85);
    },
    [ripple],
  );

  /* Heavy churn. Slow enough to feel like weight rather than animation. */
  const churn = listening
    ? { freq: "0.006;0.0105;0.007;0.006", dur: "13s", scale: "24;34;24" }
    : speaking
      ? { freq: "0.005;0.009;0.006;0.005", dur: "16s", scale: "30;46;30" }
      : { freq: "0.0045;0.0068;0.005;0.0045", dur: "34s", scale: "22;30;22" };

  const body = (
    <span
      onPointerDown={onPointerDown}
      className={cn(
        "relative block aspect-square w-full",
        listening && "orb-state-listening",
        speaking && "orb-state-speaking",
        mode === "idle" && "orb-state-idle",
      )}
    >
      {/* Ambient bloom behind the liquid — gold core, violet outside */}
      <span
        aria-hidden
        ref={bloom}
        className="orb-bloom absolute -inset-[16%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${GOLD} ${speaking ? 20 : listening ? 15 : 8}%, transparent) 0%, color-mix(in oklab, ${VIOLET} 10%, transparent) 44%, transparent 68%)`,
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
              baseFrequency="0.005"
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
            <feGaussianBlur stdDeviation="1.8" />
          </filter>

          {/* Softener for the ripples so each one reads as a swell of liquid,
              never as a drawn ring. */}
          <filter
            id={`${uid}-soft`}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves={2}
              seed={5}
              result="n2"
            >
              <animate
                attributeName="baseFrequency"
                values="0.01;0.017;0.01"
                dur={listening ? "6s" : "10s"}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="n2"
              scale="20"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="6" />
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
          {/* Violet current running under the gold */}
          <radialGradient id={`${uid}-violet`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={VIOLET} stopOpacity="0.5" />
            <stop offset="60%" stopColor={VIOLET} stopOpacity="0.18" />
            <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
          </radialGradient>
          {/* Cool sheen current — the wet-looking light rolling over the metal */}
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
            {/* Slow heavy currents at different depths and speeds */}
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
              <ellipse cx="188" cy="270" rx="96" ry="72" fill={`url(#${uid}-violet)`} />
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

          {/* Reactive ripples — touch, driver speech, HERCULES speech. Each one
              travels out from its own origin and decays independently. */}
          <g filter={`url(#${uid}-soft)`}>
            {ripples.map((r) => {
              const reach = 150 + r.strength * 90;
              const width = 5 + r.strength * 20;
              const peak = 0.14 + r.strength * 0.46;
              return (
                <g key={r.id}>
                  <circle
                    cx={r.cx}
                    cy={r.cy}
                    r="6"
                    fill="none"
                    stroke={GOLD}
                    strokeWidth={width}
                    strokeOpacity="0"
                  >
                    <animate
                      attributeName="r"
                      values={`6;${reach}`}
                      dur={`${r.dur}s`}
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.12 0.68 0.3 1"
                      fill="freeze"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      values={`0;${peak};${peak * 0.5};0`}
                      keyTimes="0;0.18;0.6;1"
                      dur={`${r.dur}s`}
                      fill="freeze"
                    />
                    <animate
                      attributeName="stroke-width"
                      values={`${width};${Math.max(2, width * 0.35)}`}
                      dur={`${r.dur}s`}
                      fill="freeze"
                    />
                  </circle>
                  {/* Violet trailing edge of the same swell */}
                  <circle
                    cx={r.cx}
                    cy={r.cy}
                    r="4"
                    fill="none"
                    stroke={VIOLET}
                    strokeWidth={width * 0.7}
                    strokeOpacity="0"
                  >
                    <animate
                      attributeName="r"
                      values={`4;${reach * 0.86}`}
                      dur={`${r.dur * 1.15}s`}
                      calcMode="spline"
                      keyTimes="0;1"
                      keySplines="0.12 0.68 0.3 1"
                      fill="freeze"
                    />
                    <animate
                      attributeName="stroke-opacity"
                      values={`0;${peak * 0.55};0`}
                      keyTimes="0;0.3;1"
                      dur={`${r.dur * 1.15}s`}
                      fill="freeze"
                    />
                  </circle>
                </g>
              );
            })}
          </g>

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
