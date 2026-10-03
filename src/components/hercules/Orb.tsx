import { cn } from "@/lib/utils";
import { useVoice, type OrbColorway, type VoiceMode } from "@/lib/voice";

/** Solid Hercules control. Ripples exist only while real audio owns speaking mode. */
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
  const label =
    mode === "listening"
      ? "Hercules is listening to you"
      : speaking
        ? "Hercules is speaking"
        : "Hercules orb, idle";
  const body = (
    <span
      className={cn(
        "hercules-solid-orb relative block aspect-square w-full",
        speaking && "orb-state-speaking",
      )}
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
      className={cn(
        "block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={mode === "idle" ? "Talk to Hercules" : "Stop Hercules voice"}
    >
      {body}
    </button>
  );
}

/** Convenience wrapper bound to the real voice lifecycle. */
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
