import { useCallback, useEffect, useRef } from "react";
import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { getVoiceLevel } from "@/lib/voice-level";
import { cn } from "@/lib/utils";

/**
 * THE ORB — a body of liquid mercury. No ring, no cord, nothing orbiting it.
 *
 * Everything moves on one animation frame loop, so the surface reacts within a
 * frame of whatever is happening:
 *
 *   base      — slow heavy churn; mercury shifting under its own weight.
 *   voice     — the live loudness drives displacement, undulation and the
 *               specular highlight, so speech visibly throws the surface.
 *   touch     — contact deforms the liquid where the finger lands and sends a
 *               swell outward that overlaps others and settles back.
 */

const shells: Record<
  OrbColorway,
  { top: string; mid: string; deep: string; rim: string; sheen: string }
> = {
  black: {
    top: "oklch(0.34 0.012 250)",
    mid: "oklch(0.14 0.008 250)",
    deep: "oklch(0.04 0.004 250)",
    rim: "oklch(0.48 0.02 250)",
    sheen: "oklch(0.78 0.02 250)",
  },
  grey: {
    top: "oklch(0.7 0.008 250)",
    mid: "oklch(0.4 0.008 250)",
    deep: "oklch(0.17 0.006 250)",
    rim: "oklch(0.8 0.008 250)",
    sheen: "oklch(0.94 0.006 250)",
  },
  white: {
    top: "oklch(0.99 0.004 90)",
    mid: "oklch(0.87 0.008 90)",
    deep: "oklch(0.56 0.014 90)",
    rim: "oklch(1 0 0)",
    sheen: "oklch(1 0 0)",
  },
};

const GOLD = "oklch(0.8 0.13 84)";
const GOLD_DEEP = "oklch(0.58 0.11 74)";
const VIOLET = "oklch(0.58 0.19 300)";
const SVG_NS = "http://www.w3.org/2000/svg";

type Ripple = {
  cx: number;
  cy: number;
  /** 0 to 1 — how hard the surface was hit. */
  strength: number;
  /** Seconds for the swell to cross the surface and die out. */
  dur: number;
  /** Seconds elapsed. */
  age: number;
  gold: SVGCircleElement;
  violet: SVGCircleElement;
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

  const modeRef = useRef<VoiceMode>(mode);
  modeRef.current = mode;

  const turb = useRef<SVGFETurbulenceElement | null>(null);
  const disp = useRef<SVGFEDisplacementMapElement | null>(null);
  const mass = useRef<SVGGElement | null>(null);
  const spec = useRef<SVGEllipseElement | null>(null);
  const rippleLayer = useRef<SVGGElement | null>(null);
  const bloom = useRef<HTMLSpanElement | null>(null);
  const ripples = useRef<Ripple[]>([]);

  /** One disturbance of the surface, from contact or from a spoken word. */
  const ripple = useCallback((cx: number, cy: number, strength: number) => {
    const layer = rippleLayer.current;
    if (!layer || ripples.current.length > 9) return;
    const st = Math.max(0.08, Math.min(1, strength));
    const mk = (stroke: string, w: number) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", String(cx));
      c.setAttribute("cy", String(cy));
      c.setAttribute("r", "6");
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", stroke);
      c.setAttribute("stroke-width", String(w));
      c.setAttribute("stroke-opacity", "0");
      layer.appendChild(c);
      return c;
    };
    const width = 6 + st * 22;
    ripples.current.push({
      cx,
      cy,
      strength: st,
      dur: 2.6 - st * 1.2,
      age: 0,
      gold: mk(GOLD, width),
      violet: mk(VIOLET, width * 0.7),
    });
  }, []);

  /* THE LOOP. Churn, undulation, specular light, voice reaction and every
     travelling swell are all advanced here, once per frame. */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let smooth = 0;
    let sinceVoiceRipple = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      const live = modeRef.current !== "idle";
      const level = live ? getVoiceLevel() : 0;
      smooth = smooth * 0.82 + level * 0.18;

      /* Heavy, slow base motion with the voice layered on top. */
      const wobble = Math.sin(t * 0.32) * 0.0012 + Math.sin(t * 0.11) * 0.0009;
      const freq = 0.0052 + wobble + smooth * 0.006;
      const scale = 20 + Math.sin(t * 0.24) * 6 + smooth * 52;
      turb.current?.setAttribute("baseFrequency", freq.toFixed(5));
      disp.current?.setAttribute("scale", scale.toFixed(2));

      /* The whole mass undulates — heavier when it is being spoken to. */
      const breathe = 1 + Math.sin(t * 0.5) * 0.012 + smooth * 0.05;
      const squash = 1 + Math.sin(t * 0.37 + 1.1) * 0.014 - smooth * 0.035;
      mass.current?.setAttribute(
        "transform",
        `translate(200 200) scale(${breathe.toFixed(4)} ${squash.toFixed(4)}) translate(-200 -200)`,
      );

      /* Light catching the surface: the highlight slides and tightens as the
         liquid moves under it. */
      if (spec.current) {
        const hx = 158 + Math.sin(t * 0.43) * 12 + smooth * 10;
        const hy = 138 + Math.cos(t * 0.31) * 10 - smooth * 12;
        spec.current.setAttribute("cx", hx.toFixed(1));
        spec.current.setAttribute("cy", hy.toFixed(1));
        spec.current.setAttribute("rx", (52 + smooth * 22).toFixed(1));
        spec.current.setAttribute("ry", (30 - smooth * 8).toFixed(1));
        spec.current.setAttribute("opacity", (0.5 + smooth * 0.45).toFixed(3));
      }

      if (bloom.current) {
        bloom.current.style.opacity = String(0.45 + smooth * 0.55);
      }

      /* Speech throws swells out of the middle of the liquid. */
      sinceVoiceRipple += dt;
      if (live && level > 0.06 && sinceVoiceRipple > 0.22 - level * 0.12) {
        sinceVoiceRipple = 0;
        ripple(200, 200, (modeRef.current === "speaking" ? 0.3 : 0.2) + level * 0.75);
      }

      /* Advance every travelling swell and retire the spent ones. */
      ripples.current = ripples.current.filter((r) => {
        r.age += dt;
        const p = r.age / r.dur;
        if (p >= 1) {
          r.gold.remove();
          r.violet.remove();
          return false;
        }
        const ease = 1 - Math.pow(1 - p, 2.4);
        const reach = 150 + r.strength * 90;
        const peak = 0.16 + r.strength * 0.46;
        const fade = p < 0.18 ? p / 0.18 : 1 - (p - 0.18) / 0.82;
        const w = (6 + r.strength * 22) * (1 - p * 0.7);
        r.gold.setAttribute("r", (6 + ease * reach).toFixed(1));
        r.gold.setAttribute("stroke-width", Math.max(1.5, w).toFixed(2));
        r.gold.setAttribute("stroke-opacity", (peak * fade).toFixed(3));
        r.violet.setAttribute("r", (4 + ease * reach * 0.84).toFixed(1));
        r.violet.setAttribute("stroke-width", Math.max(1, w * 0.7).toFixed(2));
        r.violet.setAttribute("stroke-opacity", (peak * 0.5 * fade).toFixed(3));
        return true;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ripples.current.forEach((r) => {
        r.gold.remove();
        r.violet.remove();
      });
      ripples.current = [];
    };
  }, [ripple]);

  /* Contact deforms the liquid exactly where the finger or cursor lands. */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (!box.width) return;
      const x = ((e.clientX - box.left) / box.width) * 400;
      const y = ((e.clientY - box.top) / box.height) * 400;
      ripple(x, y, 0.95);
      ripple(x, y, 0.45);
    },
    [ripple],
  );

  const body = (
    <span
      onPointerDown={onPointerDown}
      className={cn(
        "relative block aspect-square w-full touch-none",
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
              ref={turb}
              type="fractalNoise"
              baseFrequency="0.0052"
              numOctaves={3}
              seed={11}
              result="noise"
            />
            <feDisplacementMap
              ref={disp}
              in="SourceGraphic"
              in2="noise"
              scale="22"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="1.6" />
          </filter>

          {/* Softener so each swell reads as liquid, never as a drawn ring. */}
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
              baseFrequency="0.013"
              numOctaves={2}
              seed={5}
              result="n2"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n2"
              scale="22"
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
            <stop offset="0%" stopColor={s.rim} stopOpacity="0.85" />
            <stop offset="58%" stopColor={s.rim} stopOpacity="0.05" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.45" />
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
          {/* Cool sheen current — wet light rolling over heavy metal */}
          <radialGradient id={`${uid}-sheen`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={s.sheen} stopOpacity="0.55" />
            <stop offset="60%" stopColor={s.sheen} stopOpacity="0.15" />
            <stop offset="100%" stopColor={s.sheen} stopOpacity="0" />
          </radialGradient>
          {/* Caustic streak — a thin bright band of refracted light */}
          <linearGradient id={`${uid}-caustic`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
            <stop offset="45%" stopColor={GOLD} stopOpacity="0.7" />
            <stop offset="55%" stopColor={s.sheen} stopOpacity="0.6" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
          {/* Specular hot spot — the light source on the mercury */}
          <radialGradient id={`${uid}-spec`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.9" />
            <stop offset="45%" stopColor="oklch(1 0 0)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="oklch(1 0 0)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-gloss`} cx="33%" cy="22%" r="42%">
            <stop offset="0%" stopColor="oklch(1 0 0)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="oklch(1 0 0)" stopOpacity="0" />
          </radialGradient>

          <clipPath id={`${uid}-sphere`}>
            <circle cx="200" cy="200" r="150" />
          </clipPath>
        </defs>

        {/* The mass of liquid, undulating as one body */}
        <g ref={mass}>
          <circle cx="200" cy="200" r="150" fill={`url(#${uid}-shell)`} />

          <g clipPath={`url(#${uid}-sphere)`}>
            <g filter={`url(#${uid}-liquid)`}>
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
              <g className="orb-caustic">
                <rect x="20" y="150" width="360" height="34" rx="17" fill={`url(#${uid}-caustic)`} />
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

            {/* Reactive swells — touch and speech, each decaying on its own. */}
            <g ref={rippleLayer} filter={`url(#${uid}-soft)`} />

            {/* Light catching the moving surface */}
            <ellipse
              ref={spec}
              cx="158"
              cy="138"
              rx="52"
              ry="30"
              fill={`url(#${uid}-spec)`}
              transform="rotate(-22 158 138)"
            />
            <circle cx="200" cy="200" r="150" fill={`url(#${uid}-gloss)`} className="orb-gloss" />
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
        </g>
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
