import { Circle, Waves } from "lucide-react";
import { motionOptions, useTheme } from "@/lib/theme";
import { orbColorways, useVoice } from "@/lib/voice";
import { cn } from "@/lib/utils";

/** Compact app-wide Flat White, Grey, or Black selector. */
export function ThemeToggle({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const { colorway, setColorway } = useVoice();
  return (
    <div role="radiogroup" aria-label="Appearance" className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-background p-1", className)}>
      {orbColorways.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={colorway === option.id} aria-label={option.label} title={option.hint} onClick={() => setColorway(option.id)} className={cn("flex h-11 w-11 items-center justify-center rounded-full border transition-colors", colorway === option.id ? "border-foreground bg-foreground text-background" : "border-transparent text-foreground hover:border-border")}>
          <Circle className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

export function MotionPicker() {
  const { motion, setMotion } = useTheme();
  return (
    <div role="radiogroup" aria-label="Motion" className="grid gap-2 sm:grid-cols-3">
      {motionOptions.map((o) => {
        const active = motion === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={active} onClick={() => setMotion(o.id)} className={cn("bubble-card min-h-14 p-4 text-left", active && "bubble-card-on")}>
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5" />
              <span className="font-display text-sm uppercase tracking-[0.12em]">{o.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
