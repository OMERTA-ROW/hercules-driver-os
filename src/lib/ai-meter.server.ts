import { aiLimits, allowancePausedLine } from "@/data/ai-credits";

/**
 * PAID-CALL GUARD — every provider call that costs money goes through here.
 *
 * Order of operations is deliberate:
 *   1. rate limit         (cheap, no spend)
 *   2. cache lookup       (no spend, records what it saved)
 *   3. atomic reservation (credits held before the provider is touched)
 *   4. provider call
 *   5. commit or refund   (never both, always one)
 *
 * The reservation, commit and refund are single database routines that lock the
 * wallet row, so two simultaneous requests can never spend the same credit.
 */

/** Service-role client. The credit routines are EXECUTE-revoked from anon and
 *  authenticated, so ONLY this client can move credits — a signed-in browser
 *  cannot reserve, settle or refund anything, not even on its own account. */
type AdminClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as never as AdminClient;
}

/* ---- rate limiting -------------------------------------------------------
   Per server instance, in memory. It bounds runaway loops from one account;
   it is not a distributed limiter (see docs/ai-credits.md). */
const hits = new Map<string, number[]>();

export function rateLimit(userId: string): { ok: true } | { ok: false; message: string } {
  const now = Date.now();
  const list = (hits.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  const lastMinute = list.filter((t) => now - t < 60_000).length;
  if (lastMinute >= aiLimits.perMinute) {
    return { ok: false, message: "Too many AI requests in the last minute. Give it a moment." };
  }
  if (list.length >= aiLimits.perHour) {
    return { ok: false, message: "Hourly AI request limit reached on this account." };
  }
  list.push(now);
  hits.set(userId, list);
  if (hits.size > 5000) hits.clear();
  return { ok: true };
}

/* ---- private per-account cache ------------------------------------------
   Keyed by account id, so one driver's generated audio can never be served to
   another account. */
type Entry = { value: string; expires: number };
const cache = new Map<string, Entry>();

export function cacheKey(userId: string, parts: (string | number)[]) {
  return `${userId}::${parts.join("|")}`;
}

export function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet(key: string, value: string) {
  if (cache.size > 300) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expires: Date.now() + aiLimits.cacheTtlSeconds * 1000 });
}

/* ---- in-flight de-duplication ------------------------------------------- */
const inflight = new Map<string, Promise<unknown>>();

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* ---- credit reservations ------------------------------------------------
   Every call names the account explicitly (_user), resolved on the server from
   a verified session — never from client input. */

export type Reservation = { id: string; amount: number };

export async function reserve(
  userId: string,
  action: string,
  amount: number,
  idemKey?: string,
): Promise<
  | { ok: true; reservation: Reservation }
  | { ok: false; reason: "insufficient" | "error"; message: string }
> {
  const db = await admin();
  const { data, error } = await db.rpc("ai_credits_reserve", {
    _user: userId,
    _action: action,
    _amount: amount,
    _idem: idemKey ?? null,
  });
  if (error) {
    const insufficient = error.message.includes("insufficient_credits");
    console.error(`[credits] reserve failed: ${error.message}`);
    return {
      ok: false,
      reason: insufficient ? "insufficient" : "error",
      message: insufficient
        ? `Not enough AI credits — this needs ${amount}.`
        : "Could not reserve AI credits.",
    };
  }
  const row = data as unknown as { id: string; amount: number } | null;
  if (!row?.id) return { ok: false, reason: "error", message: "Could not reserve AI credits." };
  return { ok: true, reservation: { id: row.id, amount: row.amount } };
}

export async function commit(
  userId: string,
  reservationId: string,
  opts: {
    charge: number;
    model?: string;
    providerCostUsd?: number | null;
    costBasis?: "actual" | "estimated" | "none";
    cached?: boolean;
    saved?: number;
  },
) {
  const db = await admin();
  const { error } = await db.rpc("ai_credits_commit", {
    _user: userId,
    _reservation: reservationId,
    _charge: opts.charge,
    _model: opts.model ?? null,
    _provider_cost: opts.providerCostUsd ?? null,
    _cost_basis: opts.costBasis ?? "estimated",
    _cached: opts.cached ?? false,
    _saved: opts.saved ?? 0,
  });
  if (error) console.error(`[credits] commit failed: ${error.message}`);
}

export async function refund(userId: string, reservationId: string, reason: string) {
  const db = await admin();
  const { error } = await db.rpc("ai_credits_refund", {
    _user: userId,
    _reservation: reservationId,
    _reason: reason,
  });
  if (error) console.error(`[credits] refund failed: ${error.message}`);
}

/* ---- wallet preference (server-side enforcement) ------------------------ */

/** Eco means "never touch the paid provider" — enforced here, on the server,
 *  not just in the browser. */
export async function walletQuality(userId: string): Promise<"eco" | "balanced"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as never as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: { quality_pref?: string } | null }> };
      };
    };
  };
  const { data } = await db
    .from("ai_credit_wallets")
    .select("quality_pref")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.quality_pref === "eco" ? "eco" : "balanced";
}

/* ---- durable request identity ------------------------------------------- */

/** Stable across server instances and process restarts: the same request in the
 *  same cache window always produces the same key, so a retry reuses the same
 *  reservation instead of spending twice. */
export async function requestIdentity(userId: string, parts: (string | number)[]): Promise<string> {
  const window = Math.floor(Date.now() / (aiLimits.cacheTtlSeconds * 1000));
  const material = `${userId}|${window}|${parts.join("|")}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 48);
}

/* ---- one metered operation --------------------------------------------- */

export type MeteredResult<T> =
  | { ok: true; value: T; charged: number }
  | {
      ok: false;
      reason:
        | "insufficient"
        | "error"
        | "provider"
        | "pending"
        | "already_served"
        | "no_subscription"
        | "no_allowance_config"
        | "daily_limit"
        | "weekly_limit";
      resetsAt?: string | null;
      message: string;
      needed?: number;
      status?: number;
    };

type ClaimOutcome = {
  outcome:
    | "owner"
    | "pending"
    | "done"
    | "insufficient"
    | "error"
    | "no_subscription"
    | "no_allowance_config"
    | "daily_limit"
    | "weekly_limit";
  reservation?: string;
  amount?: number;
  charged?: number;
  limit?: number;
  used?: number;
  resets_at?: string;
};

async function claimExecution(
  userId: string,
  idem: string,
  action: string,
  amount: number,
): Promise<ClaimOutcome> {
  const db = await admin();
  const { data, error } = await db.rpc("ai_exec_claim", {
    _user: userId,
    _idem: idem,
    _action: action,
    _amount: amount,
    _lease_seconds: 60,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) return { outcome: "insufficient" };
    console.error(`[credits] claim failed: ${error.message}`);
    return { outcome: "error" };
  }
  return (data as ClaimOutcome | null) ?? { outcome: "error" };
}

async function finishExecution(
  userId: string,
  idem: string,
  ok: boolean,
  opts: {
    charge?: number;
    model?: string;
    providerCostUsd?: number | null;
    costBasis?: "actual" | "estimated" | "none";
    error?: string;
  },
): Promise<{ status: "settled" | "unsettled" | "failed"; charged: number }> {
  const db = await admin();
  const { data, error } = await db.rpc("ai_exec_finish", {
    _user: userId,
    _idem: idem,
    _ok: ok,
    _charge: opts.charge ?? null,
    _model: opts.model ?? null,
    _provider_cost: opts.providerCostUsd ?? null,
    _cost_basis: opts.costBasis ?? "estimated",
    _error: opts.error ?? null,
  });
  if (error) {
    // Settlement itself failed: say so, never report an unverified charge.
    console.error(`[credits] settle failed: ${error.message}`);
    return { status: "unsettled", charged: 0 };
  }
  const row = data as { status?: string; charged?: number } | null;
  const status = row?.status === "settled" || row?.status === "failed" ? row.status : "unsettled";
  return { status, charged: Number(row?.charged ?? 0) };
}

/**
 * Wraps a WHOLE paid operation with a DATABASE-OWNED execution claim, so the
 * guarantee holds across independent server instances, not just in one process:
 *
 *  - The claim's owner is the only caller that may touch the provider.
 *  - A duplicate arriving while the owner is still running gets `pending` — it
 *    waits briefly, then falls back; it never calls the provider itself.
 *  - A duplicate for an already-settled claim gets `already_served` with no new
 *    provider call and no new charge.
 *  - A retry whose hold was refunded must obtain a NEW valid hold before it may
 *    run again, so a refunded hold can never fund a second paid call.
 *  - Settlement results and errors are checked. If the hold was settled
 *    elsewhere mid-flight, the call is recorded as unsettled (charged 0) rather
 *    than reported as paid.
 *
 * Honest limit: if the network fails after the provider accepted a request, we
 * cannot know whether it ran. That case is recorded, not claimed as exactly-once.
 */
export async function runMetered<T>(opts: {
  userId: string;
  action: string;
  cost: number;
  identity: string;
  model?: string;
  providerCostUsd?: (value: T) => number | null;
  costBasis?: "actual" | "estimated" | "none";
  run: () => Promise<T>;
}): Promise<MeteredResult<T>> {
  return dedupe(`metered:${opts.identity}`, async () => {
    const claim = await claimExecution(opts.userId, opts.identity, opts.action, opts.cost);

    if (claim.outcome === "no_subscription") {
      return {
        ok: false as const,
        reason: "no_subscription" as const,
        message:
          "The real AI voice needs a monthly AI plan on this account. Your device's own voice keeps working, free.",
      };
    }
    if (claim.outcome === "no_allowance_config") {
      return {
        ok: false as const,
        reason: "no_allowance_config" as const,
        message:
          "This plan's daily and weekly allowance is not set up, so paid voice is held back rather than run without a limit. Your device's own voice is speaking, free.",
      };
    }
    if (claim.outcome === "daily_limit" || claim.outcome === "weekly_limit") {
      const scope = claim.outcome === "daily_limit" ? "daily" : "weekly";
      return {
        ok: false as const,
        reason: claim.outcome,
        message: allowancePausedLine(scope, claim.resets_at ?? null),
        resetsAt: claim.resets_at ?? null,
      };
    }
    if (claim.outcome === "insufficient") {
      return {
        ok: false as const,
        reason: "insufficient" as const,
        message: `Not enough AI credits — this needs ${opts.cost}.`,
        needed: opts.cost,
      };
    }
    if (claim.outcome === "error") {
      return {
        ok: false as const,
        reason: "error" as const,
        message: "Could not reserve AI credits.",
      };
    }
    if (claim.outcome === "pending") {
      return {
        ok: false as const,
        reason: "pending" as const,
        message: "The same request is already being handled — nothing extra was charged.",
      };
    }
    if (claim.outcome === "done") {
      return {
        ok: false as const,
        reason: "already_served" as const,
        message: "This request was already served and paid for — no new charge.",
      };
    }

    // We own the claim: we are the only caller allowed to spend at the provider.
    let value: T;
    try {
      value = await opts.run();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Provider call failed.";
      await finishExecution(opts.userId, opts.identity, false, { error: message.slice(0, 300) });
      return {
        ok: false as const,
        reason: "provider" as const,
        message,
        status: (e as { status?: number }).status ?? 0,
      };
    }

    const settled = await finishExecution(opts.userId, opts.identity, true, {
      charge: opts.cost,
      ...(opts.model ? { model: opts.model } : {}),
      providerCostUsd: opts.providerCostUsd?.(value) ?? null,
      costBasis: opts.costBasis ?? "estimated",
    });

    // Report the charge that actually happened — never the intended one.
    return { ok: true as const, value, charged: settled.charged };
  });
}

/* ---- daily / weekly allowance ------------------------------------------- */

export type Allowance = {
  subscribed: boolean;
  plan: string | null;
  timezone: string;
  dailyLimit: number | null;
  dailyUsed: number;
  weeklyLimit: number | null;
  weeklyUsed: number;
  dailyResetsAt: string | null;
  weeklyResetsAt: string | null;
  /** End of the period actually paid for; drives the subscribed decision. */
  paidThrough: string | null;
  /** True when the plan has no configured caps — paid voice is refused. */
  configMissing: boolean;
  /** Top-up credits paid for while lapsed, kept and released on the next paid month. */
  pendingPurchased: number;
};

/** Read straight from the database routine that the paid path enforces, so the
 *  screen can never show a limit that differs from the one actually applied. */
export async function allowanceStatus(userId: string): Promise<Allowance | null> {
  const db = await admin();
  const { data, error } = await db.rpc("ai_allowance_status", { _user: userId });
  if (error) {
    console.error(`[credits] allowance read failed: ${error.message}`);
    return null;
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    subscribed: r["subscribed"] === true,
    plan: (r["plan"] as string | null) ?? null,
    timezone: (r["timezone"] as string) ?? "America/New_York",
    dailyLimit: r["daily_limit"] == null ? null : Number(r["daily_limit"]),
    dailyUsed: Number(r["daily_used"] ?? 0),
    weeklyLimit: r["weekly_limit"] == null ? null : Number(r["weekly_limit"]),
    weeklyUsed: Number(r["weekly_used"] ?? 0),
    dailyResetsAt: (r["daily_resets_at"] as string | null) ?? null,
    weeklyResetsAt: (r["weekly_resets_at"] as string | null) ?? null,
    paidThrough: (r["paid_through"] as string | null) ?? null,
    configMissing: r["config_missing"] === true,
    pendingPurchased: Number(r["pending_purchased"] ?? 0),
  };
}
