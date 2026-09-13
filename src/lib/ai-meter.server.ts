import type { SupabaseClient } from "@supabase/supabase-js";
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

type Client = SupabaseClient<never, never, never>;

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

/* ---- credit reservations ------------------------------------------------ */

export type Reservation = { id: string; amount: number };

export async function reserve(
  supabase: Client,
  action: string,
  amount: number,
): Promise<{ ok: true; reservation: Reservation } | { ok: false; reason: "insufficient" | "error"; message: string }> {
  const { data, error } = await supabase.rpc("ai_credits_reserve", {
    _action: action,
    _amount: amount,
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
  supabase: Client,
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
  const { error } = await supabase.rpc("ai_credits_commit", {
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

export async function refund(supabase: Client, reservationId: string, reason: string) {
  const { error } = await supabase.rpc("ai_credits_refund", {
    _reservation: reservationId,
    _reason: reason,
  });
  if (error) console.error(`[credits] refund failed: ${error.message}`);
}
