import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type PurchaseId = "documents" | "bolt";

const STORAGE_KEY = "hercules.purchases";

type Ctx = {
  ready: boolean;
  owns: (id: PurchaseId) => boolean;
  purchase: (id: PurchaseId) => void;
  /** Mock-only: lets the driver undo a mock purchase while testing. */
  reset: (id: PurchaseId) => void;
};

const PurchaseContext = createContext<Ctx>({
  ready: false,
  owns: () => false,
  purchase: () => {},
  reset: () => {},
});

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [owned, setOwned] = useState<PurchaseId[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOwned(JSON.parse(raw) as PurchaseId[]);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: PurchaseId[]) => {
    setOwned(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const purchase = useCallback(
    (id: PurchaseId) => {
      setOwned((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const reset = useCallback(
    (id: PurchaseId) => persist(owned.filter((o) => o !== id)),
    [owned, persist],
  );

  const owns = useCallback((id: PurchaseId) => owned.includes(id), [owned]);

  return (
    <PurchaseContext.Provider value={{ ready, owns, purchase, reset }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  return useContext(PurchaseContext);
}
