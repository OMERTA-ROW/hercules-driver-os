import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  bestListing,
  categoryById,
  itemsIn,
  matchParts,
  partCatalog,
  partForFault,
  supplierById,
  supplyItems,
  type Listing,
  type PartMatch,
  type SupplyCategoryId,
  type SupplyItem,
} from "@/data/parts";
import { feeConfig, serviceFeeFor, spokenFee, totalWithFee, type FeeCategory } from "@/data/fees";

/**
 * SUPPLY & PARTS — the transacting side of ordering.
 *
 * HERCULES actually places and pays these orders, so the scaled HERCULES
 * service fee applies and is shown as its own line before approval. That is the
 * opposite of the food/grocery hand-off path in `src/lib/delivery.tsx`, where
 * the platform charges the driver and HERCULES takes nothing.
 *
 * DRIVER APPROVED: `place()` is only ever called from an explicit approval —
 * a tap on "Approve & order" or a spoken yes to a read-back proposal. Nothing
 * in this file orders anything on its own.
 *
 * PROVIDER SEAM: `getPartsProvider()` returns the mock. A real dealer /
 * supplier parts API (PACCAR, Navistar, Volvo/Mack, FleetPride, TruckPro,
 * NAPA HD) drops in here — the screens and voice layer never change.
 */

/* ------------------------------------------------------------------ PROVIDER */

export type Quote = {
  label: string;
  vendor: string;
  supplierId: string;
  category: SupplyCategoryId;
  feeCategory: FeeCategory;
  partNumber?: string;
  listing: Listing;
  subtotal: number;
  fee: number;
  total: number;
  /** Read-aloud read-back, fee included. */
  spoken: string;
};

export type PlacedSupplyOrder = {
  id: string;
  label: string;
  vendor: string;
  supplierId: string;
  category: SupplyCategoryId;
  partNumber?: string;
  subtotal: number;
  herculesFee: number;
  total: number;
  ready: string;
  location: string;
  comesToYou: boolean;
  /** Snapshot of the counter this was bought from — pickup routing reads it. */
  listing: Listing;
  placedAt: number;
  status: "placed" | "cancelled";
};

export type PartsProvider = {
  name: string;
  /** Likely parts from a spoken description or a fault code. */
  identify: (text: string) => Promise<PartMatch[]>;
  /** Availability along the route for a part or supply item. */
  availability: (listings: Listing[]) => Promise<Listing[]>;
};

/**
 * NO SUPPLIER IS CONNECTED. Nothing here queries a real dealer, warehouse or
 * roadside network, so this provider returns nothing at all rather than showing
 * invented prices, stock or arrival times. A real supplier API implements the
 * same seam and every screen above fills in for real.
 */
export const PARTS_UNAVAILABLE =
  "No parts or supply network is connected yet, so there is nothing real to price or order. Prices, stock and arrival times would be invented, so none are shown.";

const unavailableProvider: PartsProvider = {
  name: "not connected",
  identify: async () => {
    await wait(0);
    return [];
  },
  availability: async () => {
    await wait(0);
    return [];
  },
};

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let provider: PartsProvider = unavailableProvider;

/** Swap in a commercial supplier API here. */
export function setPartsProvider(p: PartsProvider) {
  provider = p;
}

export function getPartsProvider() {
  return provider;
}

/* --------------------------------------------------------------------- QUOTE */

export function quoteFor(
  label: string,
  category: SupplyCategoryId,
  listing: Listing,
  partNumber?: string,
): Quote {
  const feeCategory = categoryById(category).fee;
  const { subtotal, fee, total } = totalWithFee(listing.price, feeCategory);
  const supplier = supplierById(listing.supplierId);
  return {
    label,
    vendor: supplier.name,
    supplierId: supplier.id,
    category,
    feeCategory,
    ...(partNumber ? { partNumber } : {}),
    listing,
    subtotal,
    fee,
    total,
    spoken: `${label} from ${supplier.name}. ${spokenFee(subtotal, feeCategory)} ${listing.ready}.`,
  };
}

/* ------------------------------------------------------------------- CONTEXT */

const KEY = "hercules.supply.orders";

type Ctx = {
  ready: boolean;
  /** Ask the supplier network what part this is. */
  identify: (text: string) => Promise<PartMatch[]>;
  matches: PartMatch[];
  identifying: boolean;
  /** The part HERCULES is currently sourcing. */
  active: PartMatch | null;
  setActive: (p: PartMatch | null) => void;
  /** Source the part a live fault code points at. */
  sourceFault: (code: string) => PartMatch | undefined;
  itemsFor: (category: SupplyCategoryId) => SupplyItem[];
  quote: (
    label: string,
    category: SupplyCategoryId,
    listing: Listing,
    partNumber?: string,
  ) => Quote;
  /** DRIVER APPROVED ONLY — called after the driver's explicit yes. */
  place: (q: Quote) => PlacedSupplyOrder;
  cancel: (id: string) => void;
  orders: PlacedSupplyOrder[];
  /** Total HERCULES fee the driver has paid on transacted orders. */
  feesPaid: number;
};

const PartsContext = createContext<Ctx | null>(null);

export function PartsProviderRoot({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<PlacedSupplyOrder[]>([]);
  const [matches, setMatches] = useState<PartMatch[]>([]);
  const [identifying, setIdentifying] = useState(false);
  const [active, setActive] = useState<PartMatch | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOrders(JSON.parse(raw) as PlacedSupplyOrder[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: PlacedSupplyOrder[]) => {
    setOrders(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const identify = useCallback(async (text: string) => {
    setIdentifying(true);
    const found = await getPartsProvider().identify(text);
    setMatches(found);
    setActive(found[0] ?? null);
    setIdentifying(false);
    return found;
  }, []);

  const sourceFault = useCallback((code: string) => {
    const p = partForFault(code);
    if (p) {
      setMatches([p]);
      setActive(p);
    }
    return p;
  }, []);

  const place = useCallback(
    (q: Quote) => {
      const order: PlacedSupplyOrder = {
        id: `so-${Date.now()}`,
        label: q.label,
        vendor: q.vendor,
        supplierId: q.supplierId,
        category: q.category,
        ...(q.partNumber ? { partNumber: q.partNumber } : {}),
        subtotal: q.subtotal,
        herculesFee: q.fee,
        total: q.total,
        ready: q.listing.ready,
        location: q.listing.location,
        comesToYou: !!q.listing.comesToYou,
        listing: q.listing,
        placedAt: Date.now(),
        status: "placed",
      };
      persist([order, ...orders]);
      return order;
    },
    [orders, persist],
  );

  const cancel = useCallback(
    (id: string) => {
      persist(orders.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)));
    },
    [orders, persist],
  );

  const feesPaid = useMemo(
    () => orders.filter((o) => o.status === "placed").reduce((s, o) => s + o.herculesFee, 0),
    [orders],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      identify,
      matches,
      identifying,
      active,
      setActive,
      sourceFault,
      itemsFor: itemsIn,
      quote: quoteFor,
      place,
      cancel,
      orders,
      feesPaid,
    }),
    [ready, identify, matches, identifying, active, sourceFault, place, cancel, orders, feesPaid],
  );

  return <PartsContext.Provider value={value}>{children}</PartsContext.Provider>;
}

export function useParts() {
  const ctx = useContext(PartsContext);
  if (!ctx) throw new Error("useParts must be used inside PartsProviderRoot");
  return ctx;
}

/* --------------------------------------------------------------- CONVENIENCE */

export { bestListing, supplierById, supplyItems, serviceFeeFor, feeConfig };
export type { Listing, PartMatch, SupplyItem, SupplyCategoryId };
