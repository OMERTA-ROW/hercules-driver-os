import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type DisplayTheme = "night" | "gray" | "day";

export const themeOptions: { id: DisplayTheme; label: string; hint: string }[] = [
  { id: "night", label: "Night", hint: "Near-black, deep dim, minimal glow" },
  { id: "gray", label: "Gray", hint: "Mid-dark, low contrast, dusk and dawn" },
  { id: "day", label: "Day", hint: "Light background, high contrast, bright sun" },
];

const STORAGE_KEY = "hercules.display-theme";

type Ctx = { theme: DisplayTheme; setTheme: (t: DisplayTheme) => void; cycleTheme: () => void };

const ThemeContext = createContext<Ctx>({
  theme: "night",
  setTheme: () => {},
  cycleTheme: () => {},
});

function applyTheme(theme: DisplayTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme !== "day");
  root.style.colorScheme = theme === "day" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DisplayTheme>("night");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as DisplayTheme | null;
    const next = stored === "night" || stored === "gray" || stored === "day" ? stored : "night";
    setThemeState(next);
    applyTheme(next);
  }, []);

  const setTheme = useCallback((t: DisplayTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const order: DisplayTheme[] = ["night", "gray", "day"];
      const next = order[(order.indexOf(prev) + 1) % order.length]!;
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
