import { Moon, CloudSun, Sun } from "lucide-react";
import { useTheme, themeOptions, type DisplayTheme } from "@/lib/theme";
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
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              active
                ? "border-primary/60 bg-primary/12"
                : "border-border bg-card/50 hover:bg-accent",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="font-display text-base uppercase tracking-[0.12em]">{o.label}</span>
              {o.id === "night" ? (
                <span className="label-cap ml-auto">Default</span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{o.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
