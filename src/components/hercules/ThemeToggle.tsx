import { Waves } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function SurfaceMotionSwitch() {
  const { surfaceMotion, setSurfaceMotion, reducedMotion } = useTheme();
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.12em]">
          <Waves className="h-5 w-5" /> Surface Motion
        </div>
        <p id="surface-motion-help" className="mt-1 text-xs text-muted-foreground">
          {reducedMotion
            ? "Your device requests reduced motion, so surface and speaking ripples stay still."
            : "Adds a brief, subtle ripple only when you touch an empty surface."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label="Surface Motion"
        aria-checked={surfaceMotion}
        aria-describedby="surface-motion-help"
        onClick={() => setSurfaceMotion(!surfaceMotion)}
        className="surface-switch flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-foreground p-1"
      >
        <span className="h-5 w-5 rounded-full bg-foreground transition-transform" data-on={surfaceMotion ? "true" : "false"} />
      </button>
    </div>
  );
}
