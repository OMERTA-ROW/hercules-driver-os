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
  coverageFor,
  currentLocation,
  nearestCovered,
  orderOptions,
  serviceOf,
  services,
  spokenCoverage,
  type Coverage,
  type DropLocation,
  type Favorite,
  type OrderOption,
  type ServiceCategory,
  type ServiceId,
} from "@/data/delivery";

/**
 * DELIVERY & SUPPLY PROVIDER SEAM.
 *
 * `deliveryProvider` is the single place real service APIs get wired in:
 * per-service coverage check for the truck's lat/lng, storefront search, quote,
 * and the hand-off itself. No partner is connected today, so it answers with nothing and keeps hand-offs
 * in local storage so the whole voice flow is drivable.
 *
 * HERCULES DOES NOT PROCESS THESE ORDERS. DoorDash, Uber Eats, Grubhub,
 * Instacart, GoPuff, Walmart, Walgreens, CVS and Amazon do not permit
 * third-party order placement, so `handOff` builds the cart and opens the
 * platform's own app pre-filled — the driver submits it there and the platform
 * charges them. There is no HERCULES per-order fee on a hand-off; the Voice
 * Hand-Off Ordering add-on is what pays for this feature.
 *
 * DRIVER APPROVED: `handOff` is only ever called after the driver explicitly
 * approves a read-back order. Nothing here submits anything on its own.
 */

export type HandOff = {
  id: string;
  service: ServiceId;
  vendor: string;
  items: string[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  etaMin: number;
  dropLabel: string;
  meetNote: string;
  /** HERCULES never charges on a hand-off. Kept explicit so the UI can say so. */
  herculesFee: 0;
  /** Deep link into the platform's own app with the cart pre-filled. */
  appLink: string;
  status: "handed-off" | "cancelled";
  placedAt: string;
};

/** Back-compat alias — a hand-off is what used to be a placed order. */
export type PlacedOrder = HandOff;

export type DeliveryProviderApi = {
  name: string;
  checkCoverage: (loc: DropLocation) => Promise<Coverage[]>;
  quote: (category: ServiceCategory | "all") => Promise<OrderOption[]>;
  handOff: (input: {
    option: OrderOption;
    dropLabel: string;
    meetNote: string;
  }) => Promise<HandOff>;
  cancel: (id: string) => Promise<void>;
};

/**
 * NO DELIVERY PARTNER IS CONNECTED. Nothing below reaches a real platform, so it
 * offers nothing rather than fabricating menus, prices or arrival times.
 */
export const DELIVERY_UNAVAILABLE =
  "No delivery or supply partner is connected yet, so nothing can be ordered from here and no prices or arrival times are shown.";

export const unavailableDeliveryProvider: DeliveryProviderApi = {
  name: "not connected",
  async checkCoverage() {
    return [];
  },
  async quote() {
    return [];
  },
  async handOff({ option, dropLabel, meetNote }) {
    return {
      id: `ord-${Date.now()}`,
      service: option.service,
      vendor: option.vendor,
      items: option.items,
      subtotal: option.subtotal,
      deliveryFee: option.deliveryFee,
      total: option.subtotal + option.deliveryFee,
      herculesFee: 0,
      appLink: `${option.service}://cart/prefilled`,
      etaMin: option.etaMin,
      dropLabel,
      meetNote,
      status: "handed-off",
      placedAt: new Date().toISOString(),
    };
  },
  async cancel() {
    /* nothing is connected, so there is nothing to cancel */
  },
};

const ORDERS_KEY = "hercules.delivery.orders";
const NOTE_KEY = "hercules.delivery.meet-note";

type Ctx = {
  ready: boolean;
  provider: string;
  /** Where the truck is sitting right now. */
  location: DropLocation;
  coverage: Coverage[];
  coverageFor: (service: ServiceId) => Coverage;
  spoken: (service: ServiceId) => string;
  /** Services with no coverage at all where the truck sits. */
  unavailable: ServiceId[];
  /** True when nothing hot can reach the driver here. */
  noFoodHere: boolean;
  nearestCoveredAhead: DropLocation | undefined;
  options: OrderOption[];
  favorites: Favorite[];
  meetNote: string;
  setMeetNote: (n: string) => void;
  orders: HandOff[];
  /** Builds the cart and opens the platform app pre-filled. No HERCULES charge. */
  handOff: (option: OrderOption) => Promise<HandOff>;
  cancel: (id: string) => void;
};

const DeliveryContext = createContext<Ctx | null>(null);

export function DeliveryProvider({
  children,
  provider = unavailableDeliveryProvider,
}: {
  children: ReactNode;
  provider?: DeliveryProviderApi;
}) {
  const [ready, setReady] = useState(false);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [options, setOptions] = useState<OrderOption[]>([]);
  const [orders, setOrders] = useState<HandOff[]>([]);
  const [meetNote, setMeetNoteState] = useState("");

  useEffect(() => {
    try {
      const o = localStorage.getItem(ORDERS_KEY);
      if (o) setOrders(JSON.parse(o) as HandOff[]);
      const n = localStorage.getItem(NOTE_KEY);
      if (n) setMeetNoteState(n);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let dead = false;
    void provider.checkCoverage(currentLocation).then((c) => !dead && setCoverage(c));
    void provider.quote("all").then((o) => !dead && setOptions(o));
    return () => {
      dead = true;
    };
  }, [provider]);

  const saveOrders = useCallback((next: HandOff[]) => {
    setOrders(next);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  }, []);

  const setMeetNote = useCallback((n: string) => {
    setMeetNoteState(n);
    localStorage.setItem(NOTE_KEY, n);
  }, []);

  const handOff = useCallback(
    async (option: OrderOption) => {
      const order = await provider.handOff({
        option,
        dropLabel: currentLocation.label,
        meetNote: meetNote || "At the truck",
      });
      saveOrders([...orders, order]);
      return order;
    },
    [meetNote, orders, provider, saveOrders],
  );

  const cancel = useCallback(
    (id: string) => {
      void provider.cancel(id);
      saveOrders(orders.filter((o) => o.id !== id));
    },
    [orders, provider, saveOrders],
  );

  const lookup = useCallback((service: ServiceId) => coverageFor(currentLocation, service), []);

  const spoken = useCallback((service: ServiceId) => spokenCoverage(currentLocation, service), []);

  const unavailable = useMemo(
    () => coverage.filter((c) => c.status === "none").map((c) => c.service),
    [coverage],
  );

  const noFoodHere = useMemo(
    () =>
      services
        .filter((s) => s.category === "food")
        .every((s) => coverageFor(currentLocation, s.id).status === "none"),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      provider: provider.name,
      location: currentLocation,
      coverage,
      coverageFor: lookup,
      spoken,
      unavailable,
      noFoodHere,
      nearestCoveredAhead: nearestCovered("food"),
      options,
      favorites: [],
      meetNote,
      setMeetNote,
      orders,
      handOff,
      cancel,
    }),
    [
      ready,
      provider.name,
      coverage,
      lookup,
      spoken,
      unavailable,
      noFoodHere,
      options,
      meetNote,
      setMeetNote,
      orders,
      handOff,
      cancel,
    ],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDelivery must be used inside DeliveryProvider");
  return ctx;
}
