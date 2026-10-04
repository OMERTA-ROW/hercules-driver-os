import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type DisplayTheme = "shapher";
const SURFACE_MOTION_KEY = "hercules.surface-motion";
const LIQUID_ORB_KEY = "hercules.liquid-orb";
const LEGACY_KEYS = [
  "hercules.display-theme",
  "hercules.auto-night",
  "hercules.brightness",
  "hercules.motion",
];

type Ctx = {
  theme: DisplayTheme;
  surfaceMotion: boolean;
  setSurfaceMotion: (enabled: boolean) => void;
  reducedMotion: boolean;
  liquidOrb: boolean;
  setLiquidOrb: (enabled: boolean) => void;
  motionActive: boolean;
};

const ThemeContext = createContext<Ctx>({
  theme: "shapher",
  surfaceMotion: true,
  setSurfaceMotion: () => {},
  reducedMotion: false,
  liquidOrb: true,
  setLiquidOrb: () => {},
  motionActive: true,
});

function applyTheme() {
  const root = document.documentElement;
  root.setAttribute("data-theme", "shapher");
  root.setAttribute("data-colorway", "shapher");
  root.classList.add("dark");
  root.style.colorScheme = "dark";
  root.style.setProperty("--screen-dim", "0");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [surfaceMotion, setSurfaceMotionState] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const motionActive = surfaceMotion && !reducedMotion;
  const [liquidOrb, setLiquidOrbState] = useState(true);
  const setLiquidOrb = useCallback((enabled: boolean) => {
    setLiquidOrbState(enabled);
    localStorage.setItem(LIQUID_ORB_KEY, enabled ? "1" : "0");
  }, []);

  const setSurfaceMotion = useCallback((enabled: boolean) => {
    setSurfaceMotionState(enabled);
    localStorage.setItem(SURFACE_MOTION_KEY, enabled ? "1" : "0");
  }, []);

  useEffect(() => {
    applyTheme();
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    localStorage.setItem("hercules.orb-colorway", "shapher");
    const stored = localStorage.getItem(SURFACE_MOTION_KEY);
    setSurfaceMotionState(stored !== "0");
    setLiquidOrbState(localStorage.getItem(LIQUID_ORB_KEY) !== "0");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReducedMotion(media.matches);
    syncReduced();
    media.addEventListener("change", syncReduced);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SURFACE_MOTION_KEY) setSurfaceMotionState(e.newValue !== "0");
      if (e.key === LIQUID_ORB_KEY) setLiquidOrbState(e.newValue !== "0");
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", syncReduced);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-surface-motion", motionActive ? "on" : "off");
  }, [motionActive]);

  useEffect(() => {
    if (!motionActive) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".surface-motion-zone")) return;
      if (target.closest("button, a, input, textarea, select, form, [role='button'], [role='dialog'], .panel, .bubble-bar, [data-no-surface-motion]")) return;
      const zone = target.closest<HTMLElement>(".surface-motion-zone");
      if (!zone) return;
      const rect = zone.getBoundingClientRect();
      zone.style.setProperty("--surface-x", `${event.clientX - rect.left}px`);
      zone.style.setProperty("--surface-y", `${event.clientY - rect.top}px`);
      zone.classList.remove("surface-ripple-active");
      void zone.offsetWidth;
      zone.classList.add("surface-ripple-active");
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [motionActive]);

  return (
    <ThemeContext.Provider
      value={{
        theme: "shapher",
        surfaceMotion,
        setSurfaceMotion,
        reducedMotion,
        motionActive,
        liquidOrb,
        setLiquidOrb,
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
export function ScreenDim() { return null; }
