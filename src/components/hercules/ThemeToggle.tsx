import { Moon, CloudSun, Sun, SunDim } from "lucide-react";
import { useTheme, themeOptions, brightnessOptions, type DisplayTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const icons: Record<DisplayTheme, typeof Moon> = {
  night: Moon,
  gray: CloudSun,
  day: Sun,
};

/** Compact 3-way theme switch — used in the header and on the orb screen. */
export function ThemeToggle({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Display theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1",
        className,
      )}
    >
      {themeOptions.map((o) => {
        const Icon = icons[o.id];
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${o.label} theme`}
            title={`${o.label} — ${o.hint}`}
            onClick={() => setTheme(o.id)}
            className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              size === "sm" ? "h-9 w-9" : "h-11 w-11",
              active
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        );
      })}
    </div>
  );
}

/** Full labelled selector for the settings screen. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {themeOptions.map((o) => {
        const Icon = icons[o.id];
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setTheme(o.id)}
            aria-pressed={active}
            className={cn("bubble-card p-4 text-left", active && "bubble-card-on")}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="font-display text-base uppercase tracking-[0.12em]">{o.label}</span>
              {o.id === "night" ? <span className="label-cap ml-auto">Default</span> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{o.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * BRIGHTNESS OVERRIDE — one tap steps the whole screen (voice UI + map) dimmer.
 * Big target, dim amber, no bright surface.
 */
export function BrightnessButton({ className }: { className?: string }) {
  const { brightness, cycleBrightness } = useTheme();
  const current = brightnessOptions.find((b) => b.id === brightness)!;
  return (
    <button
      type="button"
      onClick={cycleBrightness}
      aria-label={`Screen brightness: ${current.label}. Tap to dim further.`}
      title={`Brightness — ${current.label} · ${current.hint}`}
      className={cn(
        "flex h-14 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-voice-line bg-voice-accent/8 px-3 text-voice-accent transition-colors hover:bg-voice-accent/16",
        className,
      )}
    >
      <SunDim className="h-5 w-5" />
      <span className="font-display text-[0.6rem] uppercase tracking-[0.12em]">
        {current.label}
      </span>
    </button>
  );
}

/** Labelled brightness + auto-night controls for settings. */
export function BrightnessPicker() {
  const { brightness, setBrightness, autoNight, setAutoNight } = useTheme();
  return (
    <div className="space-y-3">
      <button
        type="button"
        role="switch"
        aria-checked={autoNight}
        onClick={() => setAutoNight(!autoNight)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors",
          autoNight ? "border-primary/60 bg-primary/12" : "border-border bg-card/50",
        )}
      >
        <span>
          <span className="font-display text-base uppercase tracking-[0.12em]">
            Automatic night mode
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Dims the screen and the map on the clock — night after dark, gray at dusk and dawn, day
            in the sun. Any manual pick below takes over.
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full border transition-colors",
            autoNight ? "border-primary bg-primary/30" : "border-border bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-foreground/80 transition-all",
              autoNight ? "left-8" : "left-1",
            )}
          />
        </span>
      </button>

      <div className="grid gap-2 sm:grid-cols-4">
        {brightnessOptions.map((b) => {
          const active = !autoNight && brightness === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrightness(b.id)}
              aria-pressed={active}
              className={cn("bubble-card p-4 text-left", active && "bubble-card-on")}
            >
              <div className="font-display text-sm uppercase tracking-[0.12em]">{b.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
