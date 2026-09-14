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
  colorway,
  onActivate,
}: {
  className?: string | undefined;
  mode: VoiceMode;
  colorway: OrbColorway;
  onActivate?: () => void;
}) {
  const m = metals[colorway];
  const listening = mode === "listening";
  const speaking = mode === "speaking";
  const uid = `orb-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

  const modeRef = useRef<VoiceMode>(mode);
  modeRef.current = mode;

  const hostRef = useRef<HTMLSpanElement | null>(null);
  const bodyRef = useRef<SVGPathElement | null>(null);
  const clipRef = useRef<SVGPathElement | null>(null);
  const rimRef = useRef<SVGPathElement | null>(null);
  const bandsRef = useRef<SVGGElement | null>(null);
  const bands2Ref = useRef<SVGGElement | null>(null);
  const specRef = useRef<SVGEllipseElement | null>(null);
  const spec2Ref = useRef<SVGEllipseElement | null>(null);
  const turbRef = useRef<SVGFETurbulenceElement | null>(null);
  const bloomRef = useRef<HTMLSpanElement | null>(null);
  const dents = useRef<Dent[]>([]);

  /** One disturbance of the surface — from contact or from a spoken word. */
  const strike = useCallback((angle: number, strength: number) => {
    if (dents.current.length > 7) dents.current.shift();
    dents.current.push({
      angle,
      strength: Math.max(0.05, Math.min(1, strength)),
      dur: 1.5 + strength * 0.9,
      age: 0,
    });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    const pts = new Array<number>(SEGMENTS * 2).fill(0);
    let raf = 0;
    let last = 0;
    let t = 0;
    let smooth = 0;
    let sinceVoice = 0;
    let visible = true;

    const paint = (dt: number) => {
      t += dt;
      const live = modeRef.current !== "idle";
      const level = live ? getVoiceLevel() : 0;
      smooth = smooth * 0.84 + level * 0.16;

      /* Silhouette. */
      const d = buildPath(t, smooth, dents.current, pts);
      bodyRef.current?.setAttribute("d", d);
      clipRef.current?.setAttribute("d", d);
      rimRef.current?.setAttribute("d", d);

      /* Matte tonal fields roll slowly to keep the body dimensional. */
      const roll = ((t * 26 + smooth * 90) % 520) - 260;
      const roll2 = 260 - ((t * 15 + smooth * 40) % 520);
      bandsRef.current?.setAttribute(
        "transform",
        `translate(0 ${roll.toFixed(1)}) rotate(${(-14 + Math.sin(t * 0.3) * 6).toFixed(2)} 200 200)`,
      );
      bands2Ref.current?.setAttribute(
        "transform",
        `translate(${(roll2 * 0.7).toFixed(1)} 0) rotate(${(72 + Math.cos(t * 0.22) * 8).toFixed(2)} 200 200)`,
      );

      /* Surface fold noise breathes so folds keep re-forming. */
      turbRef.current?.setAttribute(
        "baseFrequency",
        (0.006 + Math.sin(t * 0.23) * 0.0018 + smooth * 0.004).toFixed(5),
      );

      /* Light on the surface. */
      if (specRef.current) {
        const s = specRef.current;
        s.setAttribute("cx", (156 + Math.sin(t * 0.44) * 14 + smooth * 12).toFixed(1));
        s.setAttribute("cy", (134 + Math.cos(t * 0.33) * 11 - smooth * 14).toFixed(1));
        s.setAttribute("rx", (46 + smooth * 20).toFixed(1));
        s.setAttribute("ry", (26 - smooth * 7).toFixed(1));
        s.setAttribute("opacity", (0.1 + smooth * 0.08).toFixed(3));
      }
      if (spec2Ref.current) {
        const s = spec2Ref.current;
        s.setAttribute("cx", (246 + Math.cos(t * 0.29) * 16).toFixed(1));
        s.setAttribute("cy", (262 + Math.sin(t * 0.38) * 13).toFixed(1));
        s.setAttribute("opacity", (0.05 + smooth * 0.08).toFixed(3));
      }
      if (bloomRef.current) {
        bloomRef.current.style.opacity = (0.4 + smooth * 0.5).toFixed(3);
      }

      /* Speech throws swells out of the liquid. */
      sinceVoice += dt;
      if (live && level > 0.06 && sinceVoice > 0.24 - level * 0.12) {
        sinceVoice = 0;
        strike(Math.random() * Math.PI * 2, 0.22 + level * 0.6);
      }

      dents.current = dents.current.filter((dn) => {
        dn.age += dt;
        return dn.age < dn.dur;
      });
    };

    if (reduce) {
      paint(0);
      return;
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      paint(dt);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVis = () => (document.hidden || !visible ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | undefined;
    if (host && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
          onVis();
        },
        { threshold: 0.01 },
      );
      io.observe(host);
    }

    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
      dents.current = [];
    };
  }, [strike]);

  /* Contact deforms the liquid exactly where the finger or cursor lands. */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      if (!box.width) return;
      const x = ((e.clientX - box.left) / box.width) * 400 - CX;
      const y = ((e.clientY - box.top) / box.height) * 400 - CY;
      strike(Math.atan2(y, x), 0.95);
    },
    [strike],
  );

  const body = (
    <span
      ref={hostRef}
      onPointerDown={onPointerDown}
      className={cn(
        "relative block aspect-square w-full touch-none",
        listening && "orb-state-listening",
        speaking && "orb-state-speaking",
        mode === "idle" && "orb-state-idle",
      )}
    >
      {/* Complementary backlight stays behind the matte body. */}
      <span
        aria-hidden
        className="absolute -inset-[26%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${m.glow} 50%, transparent) 0%, color-mix(in oklab, ${m.glow} ${
            speaking ? 30 : listening ? 24 : 18
          }%, transparent) 34%, color-mix(in oklab, ${m.glowDeep} ${
            speaking ? 14 : 10
          }%, transparent) 58%, transparent 76%)`,
          filter: "blur(6px)",
        }}
      />

      {/* Broad diffuse bloom adds depth without surface shine. */}
      <span
        aria-hidden
        ref={bloomRef}
        className="absolute -inset-[14%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklab, ${m.hi} ${speaking ? 14 : listening ? 11 : 6}%, transparent) 0%, transparent 62%)`,
        }}
      />

      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
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
          {/* Folds: noise displacement on the reflections only, so the
              silhouette stays clean while the surface creases. */}
          <filter
            id={`${uid}-fold`}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.006"
              numOctaves={3}
              seed={17}
              result="n"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale="34"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="2.2" />
          </filter>

          {/* Low-contrast matte body shading. */}
          <linearGradient id={`${uid}-matte`} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor={m.hi} />
            <stop offset="32%" stopColor={m.lo} />
            <stop offset="66%" stopColor={m.deep} />
            <stop offset="84%" stopColor={m.lo} />
            <stop offset="100%" stopColor={m.deep} />
          </linearGradient>

          <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.hi} stopOpacity="0" />
            <stop offset="38%" stopColor={m.hi} stopOpacity="0.18" />
            <stop offset="52%" stopColor={m.hi} stopOpacity="0.28" />
            <stop offset="66%" stopColor={m.hi} stopOpacity="0.16" />
            <stop offset="100%" stopColor={m.hi} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-dark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.deep} stopOpacity="0" />
            <stop offset="50%" stopColor={m.deep} stopOpacity="0.92" />
            <stop offset="100%" stopColor={m.deep} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-tint`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={m.tint} stopOpacity="0" />
            <stop offset="50%" stopColor={m.tint} stopOpacity="0.5" />
            <stop offset="100%" stopColor={m.tint} stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`${uid}-spec`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={m.hi} stopOpacity="0.26" />
            <stop offset="40%" stopColor={m.hi} stopOpacity="0.08" />
            <stop offset="100%" stopColor={m.hi} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-occl`} cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor={m.deep} stopOpacity="0" />
            <stop offset="100%" stopColor={m.deep} stopOpacity="0.75" />
          </radialGradient>

          <clipPath id={`${uid}-clip`}>
            <path ref={clipRef} d={CIRCLE} />
          </clipPath>
        </defs>

        {/* The mass */}
        <path ref={bodyRef} d={CIRCLE} fill={`url(#${uid}-matte)`} />

        <g clipPath={`url(#${uid}-clip)`}>
          <g filter={`url(#${uid}-fold)`}>
            {/* Horizontal reflection bands rolling down the body */}
            <g ref={bandsRef}>
              <rect x="-140" y="60" width="680" height="120" fill={`url(#${uid}-band)`} />
              <rect x="-140" y="216" width="680" height="86" fill={`url(#${uid}-dark)`} />
              <rect
                x="-140"
                y="326"
                width="680"
                height="70"
                fill={`url(#${uid}-band)`}
                opacity="0.7"
              />
            </g>
            {/* A second set crossing it, so reflections shear against each other */}
            <g ref={bands2Ref} opacity="0.55">
              <rect x="-140" y="120" width="680" height="64" fill={`url(#${uid}-dark)`} />
              <rect x="-140" y="240" width="680" height="52" fill={`url(#${uid}-tint)`} />
            </g>
          </g>

          {/* Specular light on the moving surface */}
          <ellipse
            ref={specRef}
            cx="156"
            cy="134"
            rx="46"
            ry="26"
            fill={`url(#${uid}-spec)`}
            transform="rotate(-20 156 134)"
          />
          <ellipse
            ref={spec2Ref}
            cx="246"
            cy="262"
            rx="60"
            ry="26"
            fill={`url(#${uid}-spec)`}
            opacity="0.25"
            transform="rotate(24 246 262)"
          />

          {/* Edge occlusion keeps the mass volumetric */}
          <circle cx={CX} cy={CY} r={R * 1.02} fill={`url(#${uid}-occl)`} />
        </g>

        {/* Meniscus */}
        <path
          ref={rimRef}
          d={CIRCLE}
          fill="none"
          stroke={m.rim}
          strokeOpacity="0.38"
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
