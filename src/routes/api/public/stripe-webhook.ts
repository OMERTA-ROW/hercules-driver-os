import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { aiPackById, aiPlanById } from "@/data/ai-credits";
import { stripe, verifyStripeEvent } from "@/lib/stripe.server";

/**
 * THE ONLY PLACE CREDITS ARE EVER ADDED.
 *
 * Rules this file enforces:
 *  - Stripe's own SDK verifies the raw body signature (no handwritten HMAC).
 *  - Every event is claimed in `billing_events` with a state. A retry after a
 *    FAILED attempt is processed again; only a genuinely processed event is
 *    answered as a duplicate.
 *  - Fulfilment is one atomic database call keyed by the canonical payment
 *    reference, and for subscriptions also by subscription + period start, so a
 *    checkout completion and its first invoice cannot both grant an allowance.
 *  - Monthly allowance comes ONLY from a paid invoice, using the invoice's real
 *    period boundaries. No guessed month.
 *  - The account, the credit amount, the price id and the paid amount are all
 *    resolved server-side against our own catalogue — never from client input.
 *  - Every database result is checked. The event is marked processed only after
 *    the work succeeded; otherwise it is marked failed and a 500 asks Stripe to
 *    retry.
 */

type Db = {
  rpc: (
    f: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Outcome = { ok: boolean; note: string };

function itemFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  for (const plan of [aiPlanById("assist"), aiPlanById("pro"), aiPlanById("max")]) {
    if (plan && process.env[plan.priceEnv] === priceId) {
      return { kind: "plan" as const, id: plan.id, bucket: "monthly" as const, credits: plan.credits };
    }
  }
  for (const pack of [aiPackById("pack200"), aiPackById("pack550"), aiPackById("pack1200")]) {
    if (pack && process.env[pack.priceEnv] === priceId) {
      return { kind: "pack" as const, id: pack.id, bucket: "purchased" as const, credits: pack.credits };
    }
  }
  return null;
}

function id(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string") {
    return (v as { id: string }).id;
  }
  return null;
}

async function ownerOf(
  db: Db,
  userIdHint: string | null,
  customer: string | null,
): Promise<string | null> {
  if (userIdHint) return userIdHint;
  if (!customer) return null;
  const { data, error } = await db.rpc("ai_billing_owner_of_customer", { _customer: customer });
  if (error) throw new Error(`owner lookup failed: ${error.message}`);
  return (data as string | null) ?? null;
}

async function fulfill(db: Db, args: Record<string, unknown>): Promise<string> {
  const { data, error } = await db.rpc("ai_billing_fulfill", args);
  if (error) throw new Error(`fulfil failed: ${error.message}`);
  return String(data ?? "");
}

/* ---------------------------------------------------------------- handlers */

async function handleCheckoutCompleted(
  db: Db,
  sdk: Stripe,
  session: Stripe.Checkout.Session,
): Promise<Outcome> {
  const customer = id(session.customer);
  const userId = (session.metadata?.["user_id"] ?? session.client_reference_id) || null;

  if (userId && customer) {
    const { error } = await db.rpc("ai_billing_link_customer", {
      _user: userId,
      _customer: customer,
      _subscription: id(session.subscription),
      _status: session.mode === "subscription" ? "active" : null,
    });
    if (error) throw new Error(`customer link failed: ${error.message}`);
  }

  // Subscriptions are granted ONLY from the paid invoice, never here — the
  // invoice carries the verified period and the verified amount.
  if (session.mode === "subscription") {
    return { ok: true, note: "subscription: allowance waits for the paid invoice" };
  }
  if (session.payment_status !== "paid") {
    return { ok: true, note: `one-time not paid yet (${session.payment_status})` };
  }

  const owner = await ownerOf(db, userId, customer);
  if (!owner) return { ok: true, note: "no account on this session" };

  // Resolve the price from Stripe itself, not from metadata.
  const lines = await sdk.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const line = lines.data[0];
  const item = itemFromPriceId(id(line?.price));
  if (!item || item.kind !== "pack") return { ok: true, note: "no allowlisted one-time price" };

  const paymentRef = id(session.payment_intent) ?? session.id;
  const result = await fulfill(db, {
    _user: owner,
    _kind: item.kind,
    _item_id: item.id,
    _bucket: item.bucket,
    _credits: item.credits,
    _payment_ref: paymentRef,
    _invoice: null,
    _subscription: null,
    _period_start: null,
    _period_end: null,
    _amount_cents: session.amount_total ?? null,
    _currency: session.currency ?? null,
  });
  return { ok: true, note: `pack ${item.id}: ${result}` };
}

async function handleInvoicePaid(db: Db, invoice: Stripe.Invoice): Promise<Outcome> {
  if (invoice.status !== "paid" || (invoice.amount_paid ?? 0) <= 0) {
    return { ok: true, note: `invoice not paid (${invoice.status})` };
  }
  const customer = id(invoice.customer);
  const line = invoice.lines?.data?.[0];
  const priceId =
    id((line as unknown as { price?: unknown } | undefined)?.price) ??
    id((line as unknown as { pricing?: { price_details?: { price?: unknown } } } | undefined)?.pricing?.price_details?.price);
  const item = itemFromPriceId(priceId);
  if (!item || item.kind !== "plan") return { ok: true, note: "no allowlisted subscription price" };

  const subscription =
    id((invoice as unknown as { subscription?: unknown }).subscription) ??
    id((line as unknown as { subscription?: unknown } | undefined)?.subscription);

  const period = (line as unknown as { period?: { start?: number; end?: number } } | undefined)?.period;
  const start = period?.start ? new Date(period.start * 1000).toISOString() : null;
  const end = period?.end ? new Date(period.end * 1000).toISOString() : null;
  if (!end) return { ok: true, note: "invoice line carries no period — nothing granted" };

  const hintedUser =
    (invoice.metadata?.["user_id"] as string | undefined) ??
    ((invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata?.["user_id"]) ??
    null;
  const owner = await ownerOf(db, hintedUser, customer);
  if (!owner) return { ok: true, note: "no account for this invoice" };

  const result = await fulfill(db, {
    _user: owner,
    _kind: "plan",
    _item_id: item.id,
    _bucket: "monthly",
    _credits: item.credits,
    _payment_ref: invoice.id ?? `invoice:${start}:${end}`,
    _invoice: invoice.id ?? null,
    _subscription: subscription,
    _period_start: start,
    _period_end: end,
    _amount_cents: invoice.amount_paid ?? null,
    _currency: invoice.currency ?? null,
  });
  return { ok: true, note: `plan ${item.id} period ${end}: ${result}` };
}

async function handleSubscriptionStopped(
  db: Db,
  obj: Stripe.Invoice | Stripe.Subscription,
  reason: string,
): Promise<Outcome> {
  const customer = id((obj as { customer?: unknown }).customer);
  const owner = await ownerOf(db, null, customer);
  if (!owner) return { ok: true, note: "no account for this subscription" };
  const { error } = await db.rpc("ai_credits_revoke", {
    _user: owner,
    _bucket: "monthly",
    _amount: 1_000_000,
    _ref: `stripe:stop:${(obj as { id?: string }).id ?? customer}`,
    _reason: reason,
  });
  if (error) throw new Error(`revoke failed: ${error.message}`);
  return { ok: true, note: "monthly allowance stopped" };
}

async function handleReversal(
  db: Db,
  sdk: Stripe,
  obj: Stripe.Charge | Stripe.Dispute,
  reason: string,
): Promise<Outcome> {
  // Neither a charge nor a dispute carries our metadata, so the payment intent
  // is the durable link back to the purchase we recorded.
  const paymentIntent = id((obj as { payment_intent?: unknown }).payment_intent);
  const charge = "amount_refunded" in obj ? (obj as Stripe.Charge) : null;
  const dispute = "amount" in obj && !charge ? (obj as Stripe.Dispute) : null;

  let ref = paymentIntent;
  let refunded: number | null = charge ? (charge.amount_refunded ?? 0) : (dispute?.amount ?? null);

  if (!ref && dispute) {
    const chargeId = id(dispute.charge);
    if (chargeId) {
      const full = await sdk.charges.retrieve(chargeId);
      ref = id(full.payment_intent);
    }
  }
  if (!ref) return { ok: true, note: "no payment reference on this reversal" };
  if (refunded === null) refunded = 0;

  const { data, error } = await db.rpc("ai_billing_reverse", {
    _payment_ref: ref,
    _refunded_cents: refunded,
    _reason: reason,
  });
  if (error) throw new Error(`reverse failed: ${error.message}`);
  return { ok: true, note: `reversal: ${String(data)}` };
}

/* ------------------------------------------------------------------ route */

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const sdk = stripe();
        if (!secret || !sdk) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const event = await verifyStripeEvent(raw, request.headers.get("stripe-signature"), secret);
        if (!event) return new Response("Invalid signature", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as never as Db;

        // Claim: 'duplicate' only when a previous attempt actually succeeded.
        const claim = await db.rpc("ai_billing_claim_event", {
          _provider: "stripe",
          _event_id: event.id,
          _type: event.type,
          _payload: event as unknown as Record<string, unknown>,
        });
        if (claim.error) {
          console.error(`[webhook] claim failed: ${claim.error.message}`);
          return new Response("Storage error", { status: 500 });
        }
        if (claim.data === "duplicate") return new Response("ok (already processed)");

        let outcome: Outcome = { ok: true, note: `ignored ${event.type}` };
        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              outcome = await handleCheckoutCompleted(
                db,
                sdk,
                event.data.object as Stripe.Checkout.Session,
              );
              break;
            case "invoice.paid":
            case "invoice.payment_succeeded":
              outcome = await handleInvoicePaid(db, event.data.object as Stripe.Invoice);
              break;
            case "invoice.payment_failed":
              outcome = await handleSubscriptionStopped(
                db,
                event.data.object as Stripe.Invoice,
                "Renewal payment failed — monthly allowance stopped",
              );
              break;
            case "customer.subscription.deleted":
              outcome = await handleSubscriptionStopped(
                db,
                event.data.object as Stripe.Subscription,
                "AI subscription ended — monthly allowance stopped",
              );
              break;
            case "charge.refunded":
              outcome = await handleReversal(
                db,
                sdk,
                event.data.object as Stripe.Charge,
                "Payment refunded — credits removed in proportion",
              );
              break;
            case "charge.dispute.created":
              outcome = await handleReversal(
                db,
                sdk,
                event.data.object as Stripe.Dispute,
                "Payment disputed — credits removed in proportion",
              );
              break;
            default:
              break;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`[webhook] ${event.type} failed: ${message}`);
          await db.rpc("ai_billing_finish_event", {
            _provider: "stripe",
            _event_id: event.id,
            _ok: false,
            _error: message.slice(0, 500),
          });
          // Not processed: Stripe retries, and the retry is accepted.
          return new Response("Handler error", { status: 500 });
        }

        const done = await db.rpc("ai_billing_finish_event", {
          _provider: "stripe",
          _event_id: event.id,
          _ok: true,
          _error: outcome.note.slice(0, 500),
        });
        if (done.error) {
          console.error(`[webhook] could not mark processed: ${done.error.message}`);
          return new Response("Storage error", { status: 500 });
        }

        return new Response(`ok — ${outcome.note}`);
      },
    },
  },
});
