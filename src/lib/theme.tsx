import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DisplayTheme = "night" | "gray" | "day";

export const themeOptions: { id: DisplayTheme; label: string; hint: string }[] = [
  { id: "night", label: "Night", hint: "Deep dim exposure with restrained glow" },
  { id: "gray", label: "Gray", hint: "Balanced exposure for dusk and dawn" },
  { id: "day", label: "Day", hint: "Maximum contrast for direct sun" },
];

/**
 * BRIGHTNESS OVERRIDE — one-tap steps the driver can reach without hunting.
 * `dim` is how much near-black veil sits over the whole app (voice UI + map).
 */
export type BrightnessLevel = "full" | "low" | "dim" | "blackout";

export const brightnessOptions: {
  id: BrightnessLevel;
  label: string;
  dim: number;
  hint: string;
}[] = [
  { id: "full", label: "Full", dim: 0, hint: "Daylight and bright cabs" },
  { id: "low", label: "Low", dim: 0.22, hint: "Dusk, lit highways" },
  { id: "dim", label: "Dim", dim: 0.42, hint: "Dark two-lane, protects night vision" },
  { id: "blackout", label: "Blackout", dim: 0.62, hint: "3am, no windshield glare" },
];

const THEME_KEY = "hercules.display-theme";
const AUTO_KEY = "hercules.auto-night";
const BRIGHT_KEY = "hercules.brightness";
const MOTION_KEY = "hercules.motion";

/**
 * MOTION — "system" follows the device setting. "full" and "reduced" are the
 * driver overriding the device, saved the instant they tap.
 */
export type MotionPreference = "system" | "full" | "reduced";

export const motionOptions: { id: MotionPreference; label: string; hint: string }[] = [
  { id: "system", label: "Match device", hint: "Follows this phone or tablet's motion setting" },
  { id: "full", label: "Full motion", hint: "Bubble lift, glow and section transitions" },
  { id: "reduced", label: "Calm", hint: "No animation, whatever the device says" },
];

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === "system" || value === "full" || value === "reduced";
}

function applyMotion(pref: MotionPreference) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", pref);
}

/** Time-of-day model: what the screen should be doing at this hour. */
export function themeForHour(hour: number): { theme: DisplayTheme; brightness: BrightnessLevel } {
  if (hour >= 20 || hour < 5) return { theme: "night", brightness: "blackout" };
  if (hour < 7) return { theme: "night", brightness: "dim" };
  if (hour < 9) return { theme: "gray", brightness: "low" };
  if (hour < 18) return { theme: "day", brightness: "full" };
  return { theme: "gray", brightness: "low" };
}

type Ctx = {
  theme: DisplayTheme;
  setTheme: (t: DisplayTheme) => void;
  cycleTheme: () => void;
  autoNight: boolean;
  setAutoNight: (v: boolean) => void;
  brightness: BrightnessLevel;
  setBrightness: (b: BrightnessLevel) => void;
  cycleBrightness: () => void;
  dim: number;
  motion: MotionPreference;
  setMotion: (m: MotionPreference) => void;
};

const ThemeContext = createContext<Ctx>({
  theme: "night",
  setTheme: () => {},
  cycleTheme: () => {},
  autoNight: true,
  setAutoNight: () => {},
  brightness: "dim",
  setBrightness: () => {},
  cycleBrightness: () => {},
  dim: 0.42,
  motion: "system",
  setMotion: () => {},
});

function applyTheme(theme: DisplayTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme !== "day");
  root.style.colorScheme = theme === "day" ? "light" : "dark";
}

function applyDim(dim: number) {
  document.documentElement.style.setProperty("--screen-dim", String(dim));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DisplayTheme>("night");
  const [autoNight, setAutoNightState] = useState(true);
  const [brightness, setBrightnessState] = useState<BrightnessLevel>("dim");
  // Restored-from-storage gate: the clock must not overwrite the driver's saved choice.
  const [ready, setReady] = useState(false);

  const dim = useMemo(
    () => brightnessOptions.find((b) => b.id === brightness)?.dim ?? 0,
    [brightness],
  );

  // Restore the driver's choices.
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as DisplayTheme | null;
    const storedAuto = localStorage.getItem(AUTO_KEY);
    const storedBright = localStorage.getItem(BRIGHT_KEY) as BrightnessLevel | null;
    const auto = storedAuto === null ? true : storedAuto === "1";
    setAutoNightState(auto);

    if (auto) {
      const now = themeForHour(new Date().getHours());
      setThemeState(now.theme);
      setBrightnessState(now.brightness);
      applyTheme(now.theme);
      applyDim(brightnessOptions.find((b) => b.id === now.brightness)!.dim);
      setReady(true);
      return;
    }
    const next =
      storedTheme === "night" || storedTheme === "gray" || storedTheme === "day"
        ? storedTheme
        : "night";
    const b = brightnessOptions.some((o) => o.id === storedBright)
      ? (storedBright as BrightnessLevel)
      : "dim";
    setThemeState(next);
    setBrightnessState(b);
    applyTheme(next);
    applyDim(brightnessOptions.find((o) => o.id === b)!.dim);
    setReady(true);
  }, []);

  // AUTOMATIC NIGHT MODE — re-checks the clock while the truck rolls.
  useEffect(() => {
    if (!autoNight || !ready) return;
    const tick = () => {
      const now = themeForHour(new Date().getHours());
      setThemeState(now.theme);
      applyTheme(now.theme);
      setBrightnessState(now.brightness);
      applyDim(brightnessOptions.find((b) => b.id === now.brightness)!.dim);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [autoNight, ready]);

  /** Any manual pick is the driver overriding the clock — auto steps aside. */
  const setTheme = useCallback((t: DisplayTheme) => {
    setAutoNightState(false);
    localStorage.setItem(AUTO_KEY, "0");
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  }, []);

  const cycleTheme = useCallback(() => {
    const order: DisplayTheme[] = ["night", "gray", "day"];
    setThemeState((prev) => {
      const next = order[(order.indexOf(prev) + 1) % order.length]!;
      localStorage.setItem(THEME_KEY, next);
      localStorage.setItem(AUTO_KEY, "0");
      applyTheme(next);
      return next;
    });
    setAutoNightState(false);
  }, []);

  const setBrightness = useCallback((b: BrightnessLevel) => {
    setAutoNightState(false);
    localStorage.setItem(AUTO_KEY, "0");
    setBrightnessState(b);
    localStorage.setItem(BRIGHT_KEY, b);
    applyDim(brightnessOptions.find((o) => o.id === b)!.dim);
  }, []);

  /** One tap steps Full → Low → Dim → Blackout → Full. */
  const cycleBrightness = useCallback(() => {
    setBrightnessState((prev) => {
      const i = brightnessOptions.findIndex((o) => o.id === prev);
      const next = brightnessOptions[(i + 1) % brightnessOptions.length]!;
      localStorage.setItem(BRIGHT_KEY, next.id);
      localStorage.setItem(AUTO_KEY, "0");
      applyDim(next.dim);
      return next.id;
    });
    setAutoNightState(false);
  }, []);

  const setAutoNight = useCallback((v: boolean) => {
    setAutoNightState(v);
    localStorage.setItem(AUTO_KEY, v ? "1" : "0");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        autoNight,
        setAutoNight,
        brightness,
        setBrightness,
        cycleBrightness,
        dim,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Near-black veil over everything, including the Google map layer, so the
 * whole cab dims together instead of the map staying bright.
 */
export function ScreenDim() {
  const { dim } = useTheme();
  if (dim <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] bg-background"
      style={{ opacity: dim }}
    />
  );
}
