import { useTheme } from "@/lib/theme";

/**
 * Original decorative Shapher liquid-clay sphere. It uses only flat CSS
 * surfaces: no borrowed media, models, textures, marks, audio, or branding.
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
        <span className="liquid-orb-surface" />
      </div>
    </div>
  );
}
