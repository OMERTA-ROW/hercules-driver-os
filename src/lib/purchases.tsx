import { createContext, useContext, type ReactNode } from "react";

export type PurchaseId = "documents" | "bolt" | "boltObd";

export type PurchaseAttempt = { ok: boolean; message: string };

/**
 * ONE-TIME PURCHASES — entitlements only, never granted locally.
 *
 * This app has no payment credentials configured, so there is no way to take a
 * real payment for the Document Upload unlock or for THE BOLT hardware. Nothing
 * here may pretend otherwise: ownership is not stored in the browser, and
 * tapping "buy" cannot unlock anything. When payment is switched on, `owns`
 * reads verified entitlements from the server and `purchase` opens the real
 * hosted checkout — the browser still never grants anything.
 */
export const PAYMENT_UNAVAILABLE =
  "Purchases are not switched on for this app yet — no card can be charged, so nothing can be unlocked. Your prices are unchanged and nothing was billed.";

type Ctx = {
  ready: boolean;
  /** True only for an entitlement confirmed by a real payment. */
  owns: (id: PurchaseId) => boolean;
  /** Attempts a purchase. Returns the honest outcome; never grants access. */
  purchase: (id: PurchaseId) => PurchaseAttempt;
  /** Can a payment be taken at all right now? */
  paymentAvailable: boolean;
  unavailableMessage: string;
};

const PurchaseContext = createContext<Ctx>({
  ready: true,
  owns: () => false,
  purchase: () => ({ ok: false, message: PAYMENT_UNAVAILABLE }),
  paymentAvailable: false,
  unavailableMessage: PAYMENT_UNAVAILABLE,
});

export function PurchaseProvider({ children }: { children: ReactNode }) {
  // No verified entitlement source exists yet, so nothing is owned and no
  // purchase can complete. There is deliberately no local state to forge.
  const value: Ctx = {
    ready: true,
    owns: () => false,
    purchase: () => ({ ok: false, message: PAYMENT_UNAVAILABLE }),
    paymentAvailable: false,
    unavailableMessage: PAYMENT_UNAVAILABLE,
  };

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchases() {
  return useContext(PurchaseContext);
}
