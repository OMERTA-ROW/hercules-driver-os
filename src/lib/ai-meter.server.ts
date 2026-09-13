import { aiLimits } from "@/data/ai-credits";

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
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
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
): Promise<{ ok: true; reservation: Reservation } | { ok: false; reason: "insufficient" | "error"; message: string }> {
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
        eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { quality_pref?: string } | null }> };
      };
    };
  };
  const { data } = await db.from("ai_credit_wallets").select("quality_pref").eq("user_id", userId).maybeSingle();
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
  | { ok: false; reason: "insufficient" | "error" | "provider"; message: string; needed?: number; status?: number };

/**
 * Wraps a WHOLE paid operation: de-duplication, reservation, the provider call
 * and settlement all live inside one shared promise. Concurrent identical
 * callers therefore share one provider call AND one debit — they do not each
 * commit the full cost. A retry on another instance reuses the same reservation
 * through the durable identity key, so it cannot double spend either.
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
    const held = await reserve(opts.userId, opts.action, opts.cost, opts.identity);
    if (!held.ok) {
      return {
        ok: false as const,
        reason: held.reason,
        message: held.message,
        needed: opts.cost,
      };
    }
    try {
      const value = await opts.run();
      await commit(opts.userId, held.reservation.id, {
        charge: opts.cost,
        model: opts.model,
        providerCostUsd: opts.providerCostUsd?.(value) ?? null,
        costBasis: opts.costBasis ?? "estimated",
      });
      return { ok: true as const, value, charged: opts.cost };
    } catch (e) {
      await refund(opts.userId, held.reservation.id, "Provider call failed — credits returned");
      return {
        ok: false as const,
        reason: "provider" as const,
        message: e instanceof Error ? e.message : "Provider call failed.",
        status: (e as { status?: number }).status ?? 0,
      };
    }
  });
}
