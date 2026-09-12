import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { TRIAL_DAYS, planHas, type Feature, type PlanId } from "@/data/plans";
import {
  doorFor,
  hasScope,
  makeCompanyCode,
  tierForTrucks,
  type AccountKind,
  type FleetTier,
  type Scope,
} from "@/data/accounts";

/**
 * Real account, read from the driver's own profile row in the database.
 * There is no demo account and no local stand-in: without a signed-in
 * session this is null and every gated surface says so.
 */
export type Account = {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  seats: number;
  trialEndsAt: string;
  status: "trial" | "active";
  kind: AccountKind;
  company?: { name: string; code: string };
  fleetTier?: FleetTier;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  account_kind: string | null;
  plan: string | null;
  seats: number | null;
  trial_ends_at: string | null;
  status: string | null;
  company_name: string | null;
  company_code: string | null;
  fleet_tier: number | null;
};

function toAccount(row: ProfileRow): Account {
  const kind = (row.account_kind ?? "solo") as AccountKind;
  const plan = (row.plan ?? doorFor(kind).plan) as PlanId;
  return {
    id: row.id,
    name: row.full_name?.trim() || row.email?.split("@")[0] || "Driver",
    email: row.email ?? "",
    plan,
    seats: row.seats ?? 1,
    trialEndsAt: row.trial_ends_at ?? new Date().toISOString(),
    status: row.status === "active" ? "active" : "trial",
    kind,
    ...(row.company_code
      ? { company: { name: row.company_name ?? "Carrier", code: row.company_code } }
      : {}),
    ...(row.fleet_tier ? { fleetTier: tierFromNumber(row.fleet_tier) } : {}),
  };
}

/** The profile row stores the tier as 1/2/3; the app speaks in tier ids. */
function tierFromNumber(n: number): FleetTier {
  return n >= 3 ? "tier3" : n === 2 ? "tier2" : "tier1";
}

function tierToNumber(id: FleetTier): number {
  return id === "tier3" ? 3 : id === "tier2" ? 2 : 1;
}

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  plan: PlanId;
  seats?: number;
  kind?: AccountKind;
  companyCode?: string;
  companyName?: string;
};

type Result = { error: string | null; needsConfirmation?: boolean };

type Ctx = {
  account: Account | null;
  userId: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (input: SignUpInput) => Promise<Result>;
  signOut: () => Promise<void>;
  changePlan: (plan: PlanId, seats?: number) => Promise<void>;
  refresh: () => Promise<void>;
  trialDaysLeft: number;
  can: (feature: Feature) => boolean;
  allows: (scope: Scope) => boolean;
  kind: AccountKind;
};

const AuthContext = createContext<Ctx>({
  account: null,
  userId: null,
  ready: false,
  signIn: async () => ({ error: "Auth not ready" }),
  signUp: async () => ({ error: "Auth not ready" }),
  signOut: async () => {},
  changePlan: async () => {},
  refresh: async () => {},
  trialDaysLeft: 0,
  can: () => false,
  allows: () => false,
  kind: "solo",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, account_kind, plan, seats, trial_ends_at, status, company_name, company_code, fleet_tier",
      )
      .eq("id", id)
      .maybeSingle();
    setAccount(data ? toAccount(data as ProfileRow) : null);
  }, []);

  useEffect(() => {
    let alive = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (id) void loadProfile(id);
      else setAccount(null);
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const id = data.session?.user?.id ?? null;
      setUserId(id);
      if (id) await loadProfile(id);
      setReady(true);
    })();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      setUserId(data.user.id);
      await loadProfile(data.user.id);
    }
    return { error: null };
  }, [loadProfile]);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<Result> => {
      const kind: AccountKind = input.kind ?? "solo";
      const seats = input.plan === "fleet" ? Math.max(3, input.seats ?? 3) : 1;
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: input.name, account_kind: kind },
        },
      });
      if (error) return { error: error.message };

      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
      const companyCode =
        kind === "zeusFleet"
          ? makeCompanyCode(input.companyName || input.email)
          : input.companyCode?.trim().toUpperCase() || null;

      if (data.session && data.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: input.name,
            email: input.email,
            account_kind: kind,
            plan: input.plan,
            seats,
            status: "trial",
            trial_ends_at: trialEndsAt,
            company_code: companyCode,
            company_name: kind === "zeusFleet" ? input.companyName || null : null,
            fleet_tier: kind === "zeusFleet" ? tierToNumber(tierForTrucks(seats)) : null,
          })
          .eq("id", data.user.id);
        setUserId(data.user.id);
        await loadProfile(data.user.id);
        return { error: null };
      }

      // Email confirmation is on: no session until the driver confirms.
      return { error: null, needsConfirmation: true };
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setAccount(null);
  }, []);

  const changePlan = useCallback(
    async (plan: PlanId, seats?: number) => {
      if (!userId) return;
      const nextSeats = plan === "fleet" ? Math.max(3, seats ?? account?.seats ?? 3) : 1;
      await supabase
        .from("profiles")
        .update({
          plan,
          seats: nextSeats,
          ...(plan === "fleet" ? { fleet_tier: tierToNumber(tierForTrucks(nextSeats)) } : {}),
        })
        .eq("id", userId);
      await loadProfile(userId);
    },
    [account?.seats, loadProfile, userId],
  );

  const refresh = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [loadProfile, userId]);

  const trialDaysLeft = useMemo(
    () =>
      account
        ? Math.max(0, Math.ceil((new Date(account.trialEndsAt).getTime() - Date.now()) / 86_400_000))
        : 0,
    [account],
  );

  const can = useCallback(
    (feature: Feature) => (account ? planHas(account.plan, feature) : false),
    [account],
  );

  const kind: AccountKind = account?.kind ?? "solo";

  const allows = useCallback(
    (scope: Scope) => (account ? hasScope(account.kind, scope) : false),
    [account],
  );

  return (
    <AuthContext.Provider
      value={{
        account,
        userId,
        ready,
        signIn,
        signUp,
        signOut,
        changePlan,
        refresh,
        trialDaysLeft,
        can,
        allows,
        kind,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
