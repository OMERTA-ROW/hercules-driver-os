import { useTheme } from "@/lib/theme";

/**
 * Decorative Shapher "liquid clay" orb. Pure CSS/SVG (no WebGL, no images),
 * so it is also its own static fallback. Never interactive, hidden from
 * assistive tech, hidden on compact layouts, still under reduced motion.
 */
export function LiquidOrb({ placement = "lower-right" }: { placement?: "lower-right" | "upper-right" }) {
  const { liquidOrb, motionActive } = useTheme();
  if (!liquidOrb) return null;
  return (
    <div
      aria-hidden="true"
      data-liquid-orb
      data-motion={motionActive ? "on" : "off"}
      className={`liquid-orb pointer-events-none fixed -z-10 hidden select-none xl:block ${
        placement === "upper-right" ? "right-[3vw] top-[18vh]" : "bottom-[8vh] right-[3vw]"
      }`}
    >
      <div className="liquid-orb-body">
        <svg className="liquid-orb-grain" width="100%" height="100%">
          <filter id="liquid-orb-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.9  0 0 0 0.6 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#liquid-orb-noise)" />
        </svg>
      </div>
    </div>
  );
}
