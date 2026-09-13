import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aiActionCosts,
  aiLimits,
  aiPackById,
  aiPacks,
  aiPlanById,
  aiPlans,
  providerCostAssumptions,
} from "@/data/ai-credits";

/**
 * AI CREDITS — the driver-facing account, read and paid for through the server.
 *
 * Credits are NEVER granted from the browser. The only paths that add credits
 * are the signed payment webhook (src/routes/api/public/stripe-webhook.ts) and
 * the server-only database routines it calls.
 */

const STRIPE_API = "https://api.stripe.com/v1";

function stripeKey() {
  return process.env["STRIPE_SECRET_KEY"] ?? "";
}

/** Server-side allowlist: only these ids map to a price, and only from env. */
function priceIdFor(kind: "plan" | "pack", id: string): string | null {
  const item = kind === "plan" ? aiPlanById(id) : aiPackById(id);
  if (!item) return null;
  return process.env[item.priceEnv] ?? null;
}

async function stripe(path: string, form: Record<string, string>) {
  const body = new URLSearchParams(form);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[stripe] ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Payment provider error [${res.status}]`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

function originOf(): string {
  const req = getRequest();
  const origin = req?.headers.get("origin");
  if (origin) return origin;
  const ref = req?.headers.get("referer");
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch {
      /* fall through */
    }
  }
  return "";
}

/** What is missing before real purchases can work — reported honestly in the UI. */
function missingConfig(): string[] {
  const missing: string[] = [];
  if (!stripeKey()) missing.push("STRIPE_SECRET_KEY");
  if (!process.env["STRIPE_WEBHOOK_SECRET"]) missing.push("STRIPE_WEBHOOK_SECRET");
  for (const p of aiPlans) if (!process.env[p.priceEnv]) missing.push(p.priceEnv);
  for (const p of aiPacks) if (!process.env[p.priceEnv]) missing.push(p.priceEnv);
  return missing;
}

/* ------------------------------------------------------------------ */
/* Read the account                                                   */
/* ------------------------------------------------------------------ */

export const getCreditState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as never as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
      from: (t: string) => {
        select: (c: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
          order: (
            c: string,
            o: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> };
        };
      };
    };

    const wallet = await db
      .from("ai_credit_wallets")
      .select(
        "monthly_balance, monthly_expires_at, purchased_balance, ai_plan_id, ai_plan_renews_at, quality_pref",
      )
      .maybeSingle();

    const ledger = await db
      .from("ai_credit_ledger")
      .select("kind, monthly_delta, purchased_delta, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    const usage = await db
      .from("ai_usage_events")
      .select(
        "action, model, credits_charged, credits_saved, provider_cost_usd, cost_basis, served_from_cache, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(25);

    const w = wallet.data ?? {
      monthly_balance: 0,
      monthly_expires_at: null,
      purchased_balance: 0,
      ai_plan_id: null,
      ai_plan_renews_at: null,
      quality_pref: "balanced",
    };

    const monthly = Number(w["monthly_balance"] ?? 0);
    const purchased = Number(w["purchased_balance"] ?? 0);

    return {
      wallet: {
        monthly,
        purchased,
        total: monthly + purchased,
        monthlyExpiresAt: (w["monthly_expires_at"] as string | null) ?? null,
        planId: (w["ai_plan_id"] as string | null) ?? null,
        renewsAt: (w["ai_plan_renews_at"] as string | null) ?? null,
        quality: (w["quality_pref"] as string) ?? "balanced",
        low: monthly + purchased <= aiLimits.lowBalance,
      },
      ledger: ledger.data ?? [],
      usage: usage.data ?? [],
      costs: aiActionCosts,
      assumptions: providerCostAssumptions,
      purchasing: {
        available: missingConfig().length === 0,
        missing: missingConfig(),
      },
    };
  });

/* ------------------------------------------------------------------ */
/* Quality preference (Eco = device voice, no credits)                */
/* ------------------------------------------------------------------ */

export const setAiQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ quality: z.enum(["eco", "balanced"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase as never as {
      rpc: (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
    const { error } = await db.rpc("ai_set_quality_pref", { _pref: data.quality });
    if (error) return { ok: false as const, message: "Could not save that preference." };
    return { ok: true as const, quality: data.quality };
  });

/* ------------------------------------------------------------------ */
/* Hosted checkout — subscription or one-time                         */
/* ------------------------------------------------------------------ */

export const startAiCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ kind: z.enum(["plan", "pack"]), id: z.string().min(1).max(40) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const missing = missingConfig();
    if (missing.length) {
      return {
        ok: false as const,
        reason: "unconfigured" as const,
        message:
          "Credit purchases are not switched on yet — payment setup is incomplete, so nothing can be charged.",
        missing,
      };
    }

    const price = priceIdFor(data.kind, data.id);
    if (!price) {
      return { ok: false as const, reason: "unknown_item" as const, message: "Unknown item." };
    }

    const origin = originOf();
    if (!origin) {
      return { ok: false as const, reason: "error" as const, message: "Could not build a return address." };
    }

    try {
      const session = await stripe("/checkout/sessions", {
        mode: data.kind === "plan" ? "subscription" : "payment",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        client_reference_id: context.userId,
        "metadata[user_id]": context.userId,
        "metadata[kind]": data.kind,
        "metadata[item_id]": data.id,
        ...(data.kind === "plan"
          ? {
              "subscription_data[metadata][user_id]": context.userId,
              "subscription_data[metadata][item_id]": data.id,
            }
          : {}),
        success_url: `${origin}/credits?checkout=complete`,
        cancel_url: `${origin}/credits?checkout=cancelled`,
        // Credits are granted only by the signed webhook, never by this URL.
      });
      return { ok: true as const, url: String(session["url"] ?? "") };
    } catch (e) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: e instanceof Error ? e.message : "Checkout could not be opened.",
      };
    }
  });

/** Customer portal — cancel or change the AI subscription, manage receipts. */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!stripeKey()) {
      return {
        ok: false as const,
        reason: "unconfigured" as const,
        message: "Billing management is not switched on yet.",
      };
    }
    const db = context.supabase as never as {
      from: (t: string) => {
        select: (c: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
      };
    };
    const prof = await db.from("profiles").select("stripe_customer_id").maybeSingle();
    const customer = prof.data?.["stripe_customer_id"] as string | undefined;
    if (!customer) {
      return {
        ok: false as const,
        reason: "no_customer" as const,
        message: "No AI subscription on this account yet.",
      };
    }
    try {
      const origin = originOf();
      const portal = await stripe("/billing_portal/sessions", {
        customer,
        return_url: `${origin}/credits`,
      });
      return { ok: true as const, url: String(portal["url"] ?? "") };
    } catch (e) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: e instanceof Error ? e.message : "Billing portal unavailable.",
      };
    }
  });
