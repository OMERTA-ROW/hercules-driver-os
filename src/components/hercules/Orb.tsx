import { cn } from "@/lib/utils";
import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { getVoiceLevel } from "@/lib/voice-level";
import { CloudVapor } from "./CloudVapor";

/** Original vapor sphere. Playback, never animation, owns the speaking state. */
export function Orb({
  className,
  mode,
  colorway: _colorway,
  onActivate,
  visualState = mode,
}: {
  className?: string | undefined;
  mode: VoiceMode;
  colorway: OrbColorway;
  onActivate?: () => void;
  visualState?: VoiceMode | "thinking";
}) {
  const { motionActive } = useTheme();
  const surfaceRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.setProperty("--orb-level", "0");
    if (!motionActive || (visualState !== "listening" && visualState !== "speaking")) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 50) {
        surface.style.setProperty("--orb-level", String(getVoiceLevel()));
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      surface.style.setProperty("--orb-level", "0");
    };
  }, [motionActive, visualState]);
  const label =
    visualState === "listening"
      ? "Hercules is listening to you"
      : visualState === "thinking"
        ? "Hercules is preparing a response"
      : visualState === "speaking"
        ? "Hercules is speaking"
        : "Hercules royal vapor orb, idle";
  const body = (
    <span
      ref={surfaceRef}
      className={cn(
        "hercules-solid-orb royal-vapor-orb relative block aspect-square w-full",
      )}
      data-orb-state={visualState}
      data-orb-motion={motionActive ? "on" : "off"}
      role="img"
      aria-label={label}
    >
      <span aria-hidden className="vapor-orb-flare" />
      <span aria-hidden className="vapor-orb-sphere">
        <CloudVapor state={visualState} motion={motionActive} />
      </span>
    </span>
  );

  if (!onActivate) return <span className={cn("block", className)}>{body}</span>;
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onActivate}
      className={cn(
        "vapor-orb-control block h-auto min-h-0 rounded-full border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={mode === "idle" ? "Talk to Hercules" : "Stop Hercules voice"}
    >
      {body}
    </Button>
  );
}

/** Convenience wrapper bound to the real voice lifecycle. */
export function LiveOrb({ className }: { className?: string | undefined }) {
  const { mode, orbState, colorway, listen, stop } = useVoice();
  return (
    <Orb
      className={className}
      mode={mode}
      visualState={orbState}
      colorway={colorway}
      onActivate={mode === "idle" ? listen : stop}
    />
  );
}
