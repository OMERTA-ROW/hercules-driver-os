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
  BOOKING_FEE,
  mockLoyaltyAccounts,
  truckStops,
  type ChainId,
  type LoyaltyAccount,
  type Reservation,
  type ReservationKind,
  type TruckStop,
} from "@/data/stops";

/**
 * TRUCK STOP PROVIDER SEAM.
 *
 * `stopsProvider` is the single place a real feed gets wired in: chain
 * directory + live fuel price + live parking counts + shower availability, and
 * per-chain loyalty OAuth. Today it answers from mock data and keeps linked
 * accounts and reservations in local storage so the whole flow is drivable.
 */
export type StopsProvider = {
  name: string;
  listAlongRoute: (maxMilesAhead: number) => Promise<TruckStop[]>;
  linkLoyalty: (chain: ChainId, identifier: string) => Promise<LoyaltyAccount>;
  book: (input: {
    stop: TruckStop;
    kind: ReservationKind;
    window: string;
    useCredit: boolean;
  }) => Promise<Reservation>;
  cancel: (id: string) => Promise<void>;
};

export const mockStopsProvider: StopsProvider = {
  name: "mock-truckstop-feed",
  async listAlongRoute(maxMilesAhead) {
    return truckStops
      .filter((s) => s.milesAhead <= maxMilesAhead)
      .slice()
      .sort((a, b) => a.milesAhead - b.milesAhead);
  },
  async linkLoyalty(chain, identifier) {
    const base = mockLoyaltyAccounts[chain];
    return {
      ...base,
      memberId: identifier.trim() || "•••• 4471",
      linkedAt: new Date().toISOString(),
    };
  },
  async book({ stop, kind, window, useCredit }) {
    const rawBase = kind === "shower" ? stop.showerPrice : stop.parkingPrice;
    const base = useCredit ? 0 : rawBase;
    return {
      id: `res-${kind}-${Date.now()}`,
      kind,
      stopId: stop.id,
      stopName: stop.name,
      chain: stop.chain,
      window,
      base,
      fee: BOOKING_FEE,
      total: base + BOOKING_FEE,
      usedShowerCredit: useCredit,
      status: "upcoming",
      createdAt: new Date().toISOString(),
    };
  },
  async cancel() {
    /* mock provider has nothing to call */
  },
};

const LOYALTY_KEY = "hercules.loyalty";
const RES_KEY = "hercules.reservations";

type Ctx = {
  ready: boolean;
  provider: string;
  stops: TruckStop[];
  accounts: LoyaltyAccount[];
  accountFor: (chain: ChainId) => LoyaltyAccount | undefined;
  linkLoyalty: (chain: ChainId, identifier: string) => Promise<void>;
  unlinkLoyalty: (chain: ChainId) => void;
  reservations: Reservation[];
  book: (input: {
    stop: TruckStop;
    kind: ReservationKind;
    window: string;
    useCredit: boolean;
  }) => Promise<Reservation>;
  cancel: (id: string) => void;
  /** Price after any linked-loyalty discount for that chain. */
  effectiveDiesel: (stop: TruckStop) => number;
};

const StopsContext = createContext<Ctx | null>(null);

export function StopsProvider({
  children,
  provider = mockStopsProvider,
}: {
  children: ReactNode;
  provider?: StopsProvider;
}) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stops, setStops] = useState<TruckStop[]>([]);

  useEffect(() => {
    try {
      const l = localStorage.getItem(LOYALTY_KEY);
      if (l) setAccounts(JSON.parse(l) as LoyaltyAccount[]);
      const r = localStorage.getItem(RES_KEY);
      if (r) setReservations(JSON.parse(r) as Reservation[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let dead = false;
    provider.listAlongRoute(400).then((s) => !dead && setStops(s));
    return () => {
      dead = true;
    };
  }, [provider]);

  const saveAccounts = useCallback((next: LoyaltyAccount[]) => {
    setAccounts(next);
    localStorage.setItem(LOYALTY_KEY, JSON.stringify(next));
  }, []);

  const saveReservations = useCallback((next: Reservation[]) => {
    setReservations(next);
    localStorage.setItem(RES_KEY, JSON.stringify(next));
  }, []);

  const linkLoyalty = useCallback(
    async (chain: ChainId, identifier: string) => {
      const account = await provider.linkLoyalty(chain, identifier);
      saveAccounts([...accounts.filter((a) => a.chain !== chain), account]);
    },
    [accounts, provider, saveAccounts],
  );

  const unlinkLoyalty = useCallback(
    (chain: ChainId) => saveAccounts(accounts.filter((a) => a.chain !== chain)),
    [accounts, saveAccounts],
  );

  const book = useCallback(
    async (input: { stop: TruckStop; kind: ReservationKind; window: string; useCredit: boolean }) => {
      const res = await provider.book(input);
      saveReservations([...reservations, res]);
      return res;
    },
    [provider, reservations, saveReservations],
  );

  const cancel = useCallback(
    (id: string) => {
      void provider.cancel(id);
      saveReservations(reservations.filter((r) => r.id !== id));
    },
    [provider, reservations, saveReservations],
  );

  const accountFor = useCallback(
    (chain: ChainId) => accounts.find((a) => a.chain === chain),
    [accounts],
  );

  const effectiveDiesel = useCallback(
    (stop: TruckStop) => {
      const acct = accounts.find((a) => a.chain === stop.chain);
      return Math.max(0, stop.dieselPrice - (acct ? acct.fuelDiscount : 0));
    },
    [accounts],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      provider: provider.name,
      stops,
      accounts,
      accountFor,
      linkLoyalty,
      unlinkLoyalty,
      reservations,
      book,
      cancel,
      effectiveDiesel,
    }),
    [
      ready,
      provider.name,
      stops,
      accounts,
      accountFor,
      linkLoyalty,
      unlinkLoyalty,
      reservations,
      book,
      cancel,
      effectiveDiesel,
    ],
  );

  return <StopsContext.Provider value={value}>{children}</StopsContext.Provider>;
}

export function useStops() {
  const ctx = useContext(StopsContext);
  if (!ctx) throw new Error("useStops must be used inside StopsProvider");
  return ctx;
}
