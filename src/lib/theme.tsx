import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DisplayTheme = "shapher";
const SURFACE_MOTION_KEY = "hercules.surface-motion";
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
  motionActive: boolean;
};

const ThemeContext = createContext<Ctx>({
  theme: "shapher",
  surfaceMotion: true,
  setSurfaceMotion: () => {},
  reducedMotion: false,
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
  const rippleRef = useRef<HTMLSpanElement>(null);
  const motionActive = surfaceMotion && !reducedMotion;

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
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReducedMotion(media.matches);
    syncReduced();
    media.addEventListener("change", syncReduced);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SURFACE_MOTION_KEY) setSurfaceMotionState(e.newValue !== "0");
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
      const ripple = rippleRef.current;
      if (!ripple) return;
      ripple.style.setProperty("--surface-x", `${event.clientX}px`);
      ripple.style.setProperty("--surface-y", `${event.clientY}px`);
      ripple.classList.remove("surface-ripple-active");
      void ripple.offsetWidth;
      ripple.classList.add("surface-ripple-active");
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
      }}
    >
      <span ref={rippleRef} className="shapher-surface-ripple" aria-hidden />
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
