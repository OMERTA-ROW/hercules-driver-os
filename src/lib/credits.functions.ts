import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultOrigin, trustedOrigins } from "@/data/app-origins";
import { stripe, stripeKey } from "@/lib/stripe.server";
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

/** Server-side allowlist: only these ids map to a price, and only from env. */
function priceIdFor(kind: "plan" | "pack", id: string): string | null {
  const item = kind === "plan" ? aiPlanById(id) : aiPackById(id);
  if (!item) return null;
  return process.env[item.priceEnv] ?? null;
}

/**
 * Return address for checkout. A request header is attacker-controlled, so a
 * candidate must appear in the app's own trusted list (or APP_BASE_URL).
 */
function trustedOrigin(): string {
  const allowed = [...trustedOrigins, process.env["APP_BASE_URL"] ?? ""].filter(Boolean);
  const req = getRequest();
  const candidates: string[] = [];
  const origin = req?.headers.get("origin");
  if (origin) candidates.push(origin);
  const ref = req?.headers.get("referer");
  if (ref) {
    try {
      candidates.push(new URL(ref).origin);
    } catch {
      /* ignore an unparseable referer */
    }
  }
  for (const c of candidates) if (allowed.includes(c)) return c;
  return process.env["APP_BASE_URL"] ?? defaultOrigin;
}

/** The account's payment customer, from the service-only billing mapping.
 *  The browser cannot write this, so it cannot point at someone else's. */
async function customerFor(userId: string): Promise<{ customerId: string | null; subscriptionId: string | null; status: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as never as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: Record<string, string | null> | null }>;
        };
      };
    };
  };
  const { data } = await db
    .from("ai_billing_customers")
    .select("customer_id, subscription_id, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    customerId: data?.["customer_id"] ?? null,
    subscriptionId: data?.["subscription_id"] ?? null,
    status: data?.["subscription_status"] ?? null,
  };
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
          ) => { limit: (n: number) => Promise<{ data: Record<string, string | number | boolean | null>[] | null }> };
        };
      };
    };

    type Row = Record<string, string | number | boolean | null>;

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
      ledger: (ledger.data ?? []) as Row[],
      usage: (usage.data ?? []) as Row[],
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

/* ------------------------------------------------------------------ */
/* Enterprise quote request — real record, no invented email          */
/* ------------------------------------------------------------------ */

const enterpriseInput = z.object({
  company: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  fleetSize: z.coerce.number().int().min(1).max(100000),
  expectedUsage: z.string().trim().min(10).max(2000),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  /** Honeypot — real drivers never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export const submitEnterpriseInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => enterpriseInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.website) {
      // Honeypot tripped: refuse, and say nothing that helps a bot.
      return { ok: false as const, message: "That request could not be sent." };
    }

    const db = context.supabase as never as {
      from: (t: string) => {
        select: (c: string, o?: { count: "exact"; head: true }) => {
          gte: (c: string, v: string) => Promise<{ count: number | null; error: unknown }>;
        };
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    };

    // Spam / abuse control: at most 3 requests per account per 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await db
      .from("enterprise_inquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((recent.count ?? 0) >= 3) {
      return {
        ok: false as const,
        message:
          "You have already sent several requests today. We have them — we will come back to you before you need to send another.",
      };
    }

    const { error } = await db.from("enterprise_inquiries").insert({
      user_id: context.userId,
      company: data.company,
      contact_name: data.contactName,
      email: data.email,
      phone: data.phone || null,
      fleet_size: data.fleetSize,
      expected_usage: data.expectedUsage,
      notes: data.notes || null,
    });

    if (error) {
      console.error(`[enterprise] insert failed: ${error.message}`);
      return {
        ok: false as const,
        message: "Your request was not saved. Nothing was sent — please try again.",
      };
    }

    return {
      ok: true as const,
      message:
        "Request saved. It is on our list for review — we will reply to the email you gave. Nothing is charged and no plan has changed.",
    };
  });
