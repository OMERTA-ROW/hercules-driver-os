import { createContext, useContext, useMemo, type ReactNode } from "react";
import { addons, monthlyAddons, type Addon, type AddonId } from "@/data/addons";
import { PAYMENT_UNAVAILABLE, type PurchaseAttempt } from "@/lib/purchases";
import { planById } from "@/data/plans";
import { useAuth } from "@/lib/auth";

/**
 * ADD-ON SUBSCRIPTIONS — stackable, on top of the base plan.
 *
 * Add-ons are paid, so they can only ever be switched on by a real, confirmed
 * payment. Payment is not configured for this app yet, so nothing here can be
 * activated and nothing is remembered in the browser: an add-on the driver has
 * not paid for must never read as active.
 *
 * DRIVER APPROVED: nothing is switched on except by the driver's own confirmed
 * payment, and the running monthly total only ever shows what is really billed.
 */

type Ctx = {
  ready: boolean;
  /** Active only when a real payment says so. */
  has: (id: AddonId) => boolean;
  /** Returns the honest outcome; never activates an add-on locally. */
  enable: (id: AddonId) => PurchaseAttempt;
  disable: (id: AddonId) => PurchaseAttempt;
  toggle: (id: AddonId) => PurchaseAttempt;
  activeMonthly: Addon[];
  /** Base plan cost per month, seats included. */
  baseMonthly: number;
  /** Add-on cost per month that is actually being billed. */
  addonMonthly: number;
  monthlyTotal: number;
  all: Addon[];
  /** Every add-on that could be bought once payment is switched on. */
  purchasable: Addon[];
  paymentAvailable: boolean;
  unavailableMessage: string;
};

const AddonContext = createContext<Ctx | null>(null);

export function AddonProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();

  const baseMonthly = useMemo(() => {
    if (!account) return 0;
    const plan = planById(account.plan);
    return plan.id === "fleet" ? plan.price * Math.max(3, account.seats ?? 3) : plan.price;
  }, [account]);

  const value = useMemo<Ctx>(() => {
    const refuse = (): PurchaseAttempt => ({ ok: false, message: PAYMENT_UNAVAILABLE });
    return {
      ready: true,
      has: () => false,
      enable: refuse,
      disable: refuse,
      toggle: refuse,
      activeMonthly: [],
      baseMonthly,
      addonMonthly: 0,
      monthlyTotal: baseMonthly,
      all: addons,
      purchasable: monthlyAddons,
      paymentAvailable: false,
      unavailableMessage: PAYMENT_UNAVAILABLE,
    };
  }, [baseMonthly]);

  return <AddonContext.Provider value={value}>{children}</AddonContext.Provider>;
}

export function useAddons() {
  const ctx = useContext(AddonContext);
  if (!ctx) throw new Error("useAddons must be used inside AddonProvider");
  return ctx;
}
