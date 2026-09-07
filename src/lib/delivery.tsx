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
  favorites as mockFavorites,
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
 * and order placement. Today it answers from mock data and keeps placed orders
 * in local storage so the whole voice flow is drivable.
 *
 * DRIVER APPROVED: `place` is only ever called after the driver explicitly
 * approves a read-back order. Nothing here places anything on its own.
 */

export type PlacedOrder = {
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
  status: "placed" | "cancelled";
  placedAt: string;
};

export type DeliveryProviderApi = {
  name: string;
  checkCoverage: (loc: DropLocation) => Promise<Coverage[]>;
  quote: (category: ServiceCategory | "all") => Promise<OrderOption[]>;
  place: (input: {
    option: OrderOption;
    dropLabel: string;
    meetNote: string;
  }) => Promise<PlacedOrder>;
  cancel: (id: string) => Promise<void>;
};

export const mockDeliveryProvider: DeliveryProviderApi = {
  name: "mock-delivery-aggregator",
  async checkCoverage(loc) {
    return loc.coverage;
  },
  async quote(category) {
    return category === "all"
      ? orderOptions
      : orderOptions.filter((o) => serviceOf(o.service).category === category);
  },
  async place({ option, dropLabel, meetNote }) {
    return {
      id: `ord-${Date.now()}`,
      service: option.service,
      vendor: option.vendor,
      items: option.items,
      subtotal: option.subtotal,
      deliveryFee: option.deliveryFee,
      total: option.subtotal + option.deliveryFee,
      etaMin: option.etaMin,
      dropLabel,
      meetNote,
      status: "placed",
      placedAt: new Date().toISOString(),
    };
  },
  async cancel() {
    /* mock provider has nothing to call */
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
  orders: PlacedOrder[];
  place: (option: OrderOption) => Promise<PlacedOrder>;
  cancel: (id: string) => void;
};

const DeliveryContext = createContext<Ctx | null>(null);

export function DeliveryProvider({
  children,
  provider = mockDeliveryProvider,
}: {
  children: ReactNode;
  provider?: DeliveryProviderApi;
}) {
  const [ready, setReady] = useState(false);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [options, setOptions] = useState<OrderOption[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [meetNote, setMeetNoteState] = useState("");

  useEffect(() => {
    try {
      const o = localStorage.getItem(ORDERS_KEY);
      if (o) setOrders(JSON.parse(o) as PlacedOrder[]);
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

  const saveOrders = useCallback((next: PlacedOrder[]) => {
    setOrders(next);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  }, []);

  const setMeetNote = useCallback((n: string) => {
    setMeetNoteState(n);
    localStorage.setItem(NOTE_KEY, n);
  }, []);

  const place = useCallback(
    async (option: OrderOption) => {
      const order = await provider.place({
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

  const lookup = useCallback(
    (service: ServiceId) => coverageFor(currentLocation, service),
    [],
  );

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
      favorites: mockFavorites,
      meetNote,
      setMeetNote,
      orders,
      place,
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
      place,
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
