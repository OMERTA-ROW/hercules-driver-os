import { useCallback, useEffect, useId, useRef } from "react";
import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { getVoiceLevel } from "@/lib/voice-level";
import { cn } from "@/lib/utils";

/**
 * THE ORB — a responsive body with a soft matte finish.
 *
 * The silhouette is a real closed path rebuilt every frame from a handful of
 * radial harmonics, so surface tension pulls it round while the mass keeps
 * folding. Broad tonal fields preserve its mass without chrome or hard shine.
 *
 *   base      — slow heavy churn; mercury shifting under its own weight.
 *   voice     — live loudness drives the harmonics, the bands and the highlight.
 *   touch     — contact dents the liquid where the finger lands, and the dent
 *               travels outward and settles.
 *
 * One requestAnimationFrame loop, zero React re-renders per frame. Pauses when
 * offscreen or hidden, and holds still under prefers-reduced-motion.
 */

/** Matte body and complementary backlight for each app colorway. */
const metals: Record<
  OrbColorway,
  { hi: string; lo: string; deep: string; rim: string; tint: string; glow: string; glowDeep: string }
> = {
  black: {
    hi: "oklch(0.35 0.012 250)",
    lo: "oklch(0.23 0.01 250)",
    deep: "oklch(0.11 0.008 250)",
    rim: "oklch(0.7 0.12 82)", tint: "oklch(0.6 0.1 82)",
    glow: "oklch(0.8 0.15 84)", glowDeep: "oklch(0.55 0.12 76)",
  },
  pink: {
    hi: "oklch(0.65 0.11 350)", lo: "oklch(0.47 0.1 350)", deep: "oklch(0.24 0.07 350)",
    rim: "oklch(0.84 0.07 205)", tint: "oklch(0.7 0.08 205)",
    glow: "oklch(0.84 0.09 205)", glowDeep: "oklch(0.52 0.09 210)",
  },
  grey: {
    hi: "oklch(0.64 0.005 250)",
    lo: "oklch(0.46 0.008 250)",
    deep: "oklch(0.24 0.006 250)",
    rim: "oklch(0.9 0.003 250)", tint: "oklch(0.76 0.008 250)",
    glow: "oklch(0.94 0.004 250)", glowDeep: "oklch(0.62 0.008 250)",
  },
  gold: {
    hi: "oklch(0.74 0.12 82)", lo: "oklch(0.56 0.12 78)", deep: "oklch(0.32 0.08 72)",
    rim: "oklch(0.16 0.02 70)", tint: "oklch(0.22 0.025 70)",
    glow: "oklch(0.08 0.01 70)", glowDeep: "oklch(0.02 0 0)",
  },
  turquoise: {
    hi: "oklch(0.66 0.11 185)", lo: "oklch(0.47 0.1 185)", deep: "oklch(0.23 0.065 190)",
    rim: "oklch(0.76 0.12 28)", tint: "oklch(0.68 0.12 28)",
    glow: "oklch(0.76 0.13 28)", glowDeep: "oklch(0.48 0.1 25)",
  },
};

const CX = 200;
const CY = 200;
const R = 150;
/** Silhouette resolution — enough for smooth folds, cheap enough for a tablet. */
const SEGMENTS = 72;
/** Static circle used for SSR and reduced-motion first paint. */
const CIRCLE = `M ${CX - R} ${CY} a ${R} ${R} 0 1 0 ${R * 2} 0 a ${R} ${R} 0 1 0 ${-R * 2} 0`;

type Dent = {
  /** Angle on the surface the contact landed nearest. */
  angle: number;
  strength: number;
  dur: number;
  age: number;
};

function buildPath(t: number, loud: number, dents: Dent[], out: number[]): string {
  const amp = 0.028 + loud * 0.075;
  let d = "";
  for (let i = 0; i < SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    /* Surface-tension harmonics: low orders dominate so it always reads round. */
    let k =
      Math.sin(a * 2 + t * 0.55) * 0.55 +
      Math.sin(a * 3 - t * 0.41) * 0.3 +
      Math.sin(a * 5 + t * 0.72) * 0.14 +
      Math.sin(a * 7 - t * 0.95) * 0.07;
    /* Travelling dents from contact and from speech. */
    for (const dn of dents) {
      const p = dn.age / dn.dur;
      if (p >= 1) continue;
      let diff = Math.abs(((a - dn.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      diff = Math.PI - diff;
      const front = p * 2.2;
      const band = Math.exp(-Math.pow((diff - front) * 2.4, 2));
      const decay = Math.pow(1 - p, 1.8);
      k -= dn.strength * band * decay * 2.6;
    }
    const r = R * (1 + k * amp);
    out[i * 2] = CX + Math.cos(a) * r;
    out[i * 2 + 1] = CY + Math.sin(a) * r;
  }
  /* Closed Catmull-Rom-ish smoothing through the points (quadratic midpoints). */
  const px = (i: number) => out[((i + SEGMENTS) % SEGMENTS) * 2]!;
  const py = (i: number) => out[((i + SEGMENTS) % SEGMENTS) * 2 + 1]!;
  d = `M ${((px(0) + px(-1)) / 2).toFixed(2)} ${((py(0) + py(-1)) / 2).toFixed(2)}`;
  for (let i = 0; i < SEGMENTS; i++) {
    const mx = (px(i) + px(i + 1)) / 2;
    const my = (py(i) + py(i + 1)) / 2;
    d += ` Q ${px(i).toFixed(2)} ${py(i).toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  return `${d} Z`;
}

export function Orb({
  className,
  mode,
  colorway: _colorway,
  onActivate,
}: {
  className?: string | undefined;
  mode: VoiceMode;
  colorway: OrbColorway;
  onActivate?: () => void;
}) {
  const speaking = mode === "speaking";
  const label = mode === "listening" ? "Hercules is listening to you" : speaking ? "Hercules is speaking" : "Hercules orb, idle";
  const body = (
    <span
      className={cn("hercules-solid-orb relative block aspect-square w-full", speaking && "orb-state-speaking")}
      role="img"
      aria-label={label}
    >
      <span aria-hidden className="orb-ripple-ring orb-ripple-ring-one" />
      <span aria-hidden className="orb-ripple-ring orb-ripple-ring-two" />
      <span aria-hidden className="orb-solid-core">
        <span className="font-display text-[clamp(0.55rem,18cqw,1.1rem)] font-semibold">H</span>
      </span>
    </span>
  );

  if (!onActivate) return <span className={cn("block", className)}>{body}</span>;
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn("block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
      aria-label={mode === "idle" ? "Talk to Hercules" : "Stop Hercules voice"}
    >
      {body}
    </button>
  );
}
