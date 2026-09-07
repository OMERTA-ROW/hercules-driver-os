import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { TRIAL_DAYS, planHas, type Feature, type PlanId } from "@/data/plans";
import {
  companyByCode,
  doorFor,
  hasScope,
  makeCompanyCode,
  type AccountKind,
  type Scope,
} from "@/data/accounts";

export type Account = {
  name: string;
  email: string;
  plan: PlanId;
  seats: number;
  trialEndsAt: string; // ISO date
  status: "trial" | "active";
  /** Which login door this account came through — HERCULES solo, HERCULES
   *  company driver, or the ZEUS fleet side. Same shared model, different scope. */
  kind: AccountKind;
  /** Set for a company driver linked by invite/code, and for a ZEUS fleet. */
  company?: { name: string; code: string };
};

const STORAGE_KEY = "hercules.account";

function trialEnd(days = TRIAL_DAYS) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

type SignUpInput = {
  name: string;
  email: string;
  plan: PlanId;
  seats?: number;
  kind?: AccountKind;
  /** Company code a driver was given, or the carrier name a fleet onboards as. */
  companyCode?: string;
  companyName?: string;
};

type Ctx = {
  account: Account | null;
  ready: boolean;
  signIn: (email: string, kind?: AccountKind) => void;
  signUp: (input: SignUpInput) => void;
  signOut: () => void;
  changePlan: (plan: PlanId, seats?: number) => void;
  trialDaysLeft: number;
  can: (feature: Feature) => boolean;
  /** Permission scope for the door this account signed in through. */
  allows: (scope: Scope) => boolean;
  kind: AccountKind;
};

const AuthContext = createContext<Ctx>({
  account: null,
  ready: false,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {},
  changePlan: () => {},
  trialDaysLeft: 0,
  can: () => false,
  allows: () => false,
  kind: "solo",
});


export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAccount(JSON.parse(raw) as Account);
    } catch {
      /* ignore malformed local state */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Account | null) => {
    setAccount(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signIn = useCallback(
    (email: string) => {
      persist({
        name: email.split("@")[0]?.replace(/[._]/g, " ") || "Driver",
        email,
        plan: "owner",
        seats: 1,
        trialEndsAt: trialEnd(4),
        status: "trial",
      });
    },
    [persist],
  );

  const signUp = useCallback(
    ({ name, email, plan, seats }: { name: string; email: string; plan: PlanId; seats?: number }) => {
      persist({
        name: name || "Driver",
        email,
        plan,
        seats: plan === "fleet" ? Math.max(3, seats ?? 3) : 1,
        trialEndsAt: trialEnd(),
        status: "trial",
      });
    },
    [persist],
  );

  const signOut = useCallback(() => persist(null), [persist]);

  const changePlan = useCallback(
    (plan: PlanId, seats?: number) => {
      setAccount((prev) => {
        if (!prev) return prev;
        const next: Account = {
          ...prev,
          plan,
          seats: plan === "fleet" ? Math.max(3, seats ?? prev.seats ?? 3) : 1,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const trialDaysLeft = account
    ? Math.max(
        0,
        Math.ceil((new Date(account.trialEndsAt).getTime() - Date.now()) / 86_400_000),
      )
    : 0;

  const can = useCallback(
    (feature: Feature) => (account ? planHas(account.plan, feature) : false),
    [account],
  );

  return (
    <AuthContext.Provider
      value={{ account, ready, signIn, signUp, signOut, changePlan, trialDaysLeft, can }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
