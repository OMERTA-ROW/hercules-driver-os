import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addons, addonById, monthlyAddons, type Addon, type AddonId } from "@/data/addons";
import { usePurchases } from "@/lib/purchases";
import { planById } from "@/data/plans";
import { useAuth } from "@/lib/auth";

/**
 * ADD-ON SUBSCRIPTIONS — stackable, on top of the base plan.
 *
 * Monthly add-ons live here (opt-in, opt-out any time). One-time unlocks stay
 * in `purchases`, and this provider reads them so one screen can show the
 * driver everything they are paying, in one running total.
 *
 * DRIVER APPROVED: nothing is switched on here except by the driver's own tap
 * or spoken yes, and the total updates in front of them as they do it.
 */

const KEY = "hercules.addons.monthly";

type Ctx = {
  ready: boolean;
  /** Is this add-on active right now (monthly enabled, or one-time owned)? */
  has: (id: AddonId) => boolean;
  enable: (id: AddonId) => void;
  disable: (id: AddonId) => void;
  toggle: (id: AddonId) => void;
  /** Monthly add-ons currently switched on. */
  activeMonthly: Addon[];
  /** Base plan cost per month, seats included. */
  baseMonthly: number;
  /** Add-on cost per month. */
  addonMonthly: number;
  /** What the driver pays every month, all in. */
  monthlyTotal: number;
  all: Addon[];
};

const AddonContext = createContext<Ctx | null>(null);

export function AddonProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const { owns, purchase } = usePurchases();
  const [enabled, setEnabled] = useState<AddonId[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEnabled(JSON.parse(raw) as AddonId[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: AddonId[]) => {
    setEnabled(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const has = useCallback(
    (id: AddonId) =>
      addonById(id).billing === "one-time" ? owns("documents") : enabled.includes(id),
    [enabled, owns],
  );

  const enable = useCallback(
    (id: AddonId) => {
      if (addonById(id).billing === "one-time") {
        purchase("documents");
        return;
      }
      if (!enabled.includes(id)) persist([...enabled, id]);
    },
    [enabled, persist, purchase],
  );

  const disable = useCallback(
    (id: AddonId) => {
      if (addonById(id).billing === "one-time") return; // bought is bought
      persist(enabled.filter((e) => e !== id));
    },
    [enabled, persist],
  );

  const toggle = useCallback(
    (id: AddonId) => (has(id) ? disable(id) : enable(id)),
    [disable, enable, has],
  );

  const activeMonthly = useMemo(
    () => monthlyAddons.filter((a) => enabled.includes(a.id)),
    [enabled],
  );

  const baseMonthly = useMemo(() => {
    if (!account) return 0;
    const plan = planById(account.plan);
    return plan.id === "fleet" ? plan.price * Math.max(3, account.seats ?? 3) : plan.price;
  }, [account]);

  const addonMonthly = useMemo(
    () => activeMonthly.reduce((sum, a) => sum + a.price, 0),
    [activeMonthly],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      has,
      enable,
      disable,
      toggle,
      activeMonthly,
      baseMonthly,
      addonMonthly,
      monthlyTotal: baseMonthly + addonMonthly,
      all: addons,
    }),
    [ready, has, enable, disable, toggle, activeMonthly, baseMonthly, addonMonthly],
  );

  return <AddonContext.Provider value={value}>{children}</AddonContext.Provider>;
}

export function useAddons() {
  const ctx = useContext(AddonContext);
  if (!ctx) throw new Error("useAddons must be used inside AddonProvider");
  return ctx;
}
