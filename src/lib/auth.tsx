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

export type SignInOptions = { companyCode?: string; kind?: AccountKind };

type Result = { error: string | null; needsConfirmation?: boolean };

type Ctx = {
  account: Account | null;
  userId: string | null;
  ready: boolean;
  /** Set when the profile row could not be read. Never means "no account". */
  profileError: string | null;
  signIn: (email: string, password: string, opts?: SignInOptions) => Promise<Result>;
  signUp: (input: SignUpInput) => Promise<Result>;
  signOut: () => Promise<void>;
  /** Sends the confirmation email again. Never reveals whether an account exists. */
  resendConfirmation: (email: string) => Promise<{ ok: boolean; message: string }>;
  /** Emails a recovery link. Never reveals whether the address has an account. */
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; message: string }>;
  /** Sets a new password from a recovery session on /reset-password. */
  updatePassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  /** Records the driver's chosen plan. Never marks a subscription paid. */
  changePlan: (plan: PlanId, seats?: number) => Promise<{ ok: boolean; message: string }>;
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
  profileError: null,
  signIn: async () => ({ error: "Auth not ready" }),
  signUp: async () => ({ error: "Auth not ready" }),
  signOut: async () => {},
  resendConfirmation: async () => ({ ok: false, message: "Accounts are not ready yet." }),
  requestPasswordReset: async () => ({ ok: false, message: "Accounts are not ready yet." }),
  updatePassword: async () => ({ ok: false, message: "Accounts are not ready yet." }),
  changePlan: async () => ({ ok: false, message: "Accounts are not ready yet." }),
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
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, account_kind, plan, seats, trial_ends_at, status, company_name, company_code, fleet_tier",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) {
      // A profile that cannot be read is not a missing account — say so.
      console.error(`[auth] profile read failed: ${error.message}`);
      setProfileError("Your account could not be read just now. Check your connection and retry.");
      return;
    }
    setProfileError(null);
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
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        const id = data.session?.user?.id ?? null;
        setUserId(id);
        if (id) await loadProfile(id);
      } catch {
        if (!alive) return;
        setUserId(null);
        setAccount(null);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string, opts?: SignInOptions): Promise<Result> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        setUserId(data.user.id);
        // Company membership is NOT set here. A code typed on a sign-in screen
        // proves nothing; joining a carrier goes through the invite flow in
        // src/lib/company.tsx, which the database checks and an owner approves.
        if (opts?.kind) {
          await supabase
            .from("profiles")
            .update({ account_kind: opts.kind })
            .eq("id", data.user.id);
        }
        await loadProfile(data.user.id);
      }
      return { error: null };
    },
    [loadProfile],
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<Result> => {
      const kind: AccountKind = input.kind ?? "solo";
      const seats = input.plan === "fleet" ? Math.max(3, input.seats ?? 3) : 1;
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
      // No company code is minted or accepted here: a fleet is created, and a
      // driver joins one, through the checked company routines after sign-in.
      const fleetTier = kind === "zeusFleet" ? tierToNumber(tierForTrucks(seats)) : null;

      // The chosen plan, seats and trial ride along as sign-up metadata so the
      // account keeps them even when the driver has to confirm by email first.
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          // The confirmation link brings the driver straight back into setup.
          emailRedirectTo: `${window.location.origin}/welcome`,
          data: {
            full_name: input.name,
            account_kind: kind,
            plan: input.plan,
            seats,
            trial_ends_at: trialEndsAt,
            ...(kind === "zeusFleet" && input.companyName
              ? { company_name: input.companyName }
              : {}),
            ...(fleetTier ? { fleet_tier: fleetTier } : {}),
          },
        },
      });
      if (error) return { error: error.message };

      if (data.session && data.user) {
        // status and trial_ends_at are server-owned: the sign-up trigger sets
        // them from the metadata above, and this screen cannot write them.
        await supabase
          .from("profiles")
          .update({
            full_name: input.name,
            email: input.email,
            account_kind: kind,
            plan: input.plan,
            seats,
            company_name: kind === "zeusFleet" ? input.companyName || null : null,
            fleet_tier: fleetTier,
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
    setProfileError(null);
  }, []);

  const changePlan = useCallback(
    async (plan: PlanId, seats?: number) => {
      if (!userId) return { ok: false, message: "Sign in first." };
      const nextSeats = plan === "fleet" ? Math.max(3, seats ?? account?.seats ?? 3) : 1;
      // Only the driver's SELECTION is written here. Subscription status, trial
      // expiry and the payment customer are server-owned and cannot be set from
      // this screen — a plan choice is not a paid subscription.
      const { error } = await supabase
        .from("profiles")
        .update({
          plan,
          seats: nextSeats,
          ...(plan === "fleet" ? { fleet_tier: tierToNumber(tierForTrucks(nextSeats)) } : {}),
        })
        .eq("id", userId);
      if (error) {
        console.error(`[auth] plan change failed: ${error.message}`);
        return { ok: false, message: "Your plan could not be saved. Nothing was changed." };
      }
      await loadProfile(userId);
      return { ok: true, message: "Plan saved." };
    },
    [account?.seats, loadProfile, userId],
  );

  const refresh = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [loadProfile, userId]);

  const resendConfirmation = useCallback(async (email: string) => {
    const address = email.trim();
    if (!address) return { ok: false, message: "Enter your email address first." };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/welcome` },
    });
    if (error) {
      const wait = /rate|seconds|too many/i.test(error.message);
      return {
        ok: false,
        message: wait
          ? "One was just sent — wait a minute before asking for another."
          : "That didn't send. Check the address and try again.",
      };
    }
    return { ok: true, message: "Sent. It can take a minute to arrive." };
  }, []);

  const trialDaysLeft = useMemo(
    () =>
      account
        ? Math.max(
            0,
            Math.ceil((new Date(account.trialEndsAt).getTime() - Date.now()) / 86_400_000),
          )
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
        profileError,
        signIn,
        signUp,
        signOut,
        resendConfirmation,
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
