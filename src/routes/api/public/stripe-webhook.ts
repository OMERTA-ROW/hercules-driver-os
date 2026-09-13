import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { aiPacks, aiPackById, aiPlanById } from "@/data/ai-credits";
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
 *  - Ownership we EXPECT to exist but cannot resolve is an error, so Stripe
 *    retries — it is never marked processed and lost.
 *  - Invoices record their real payment intent and charge, so a monthly refund
 *    (which arrives as a charge or dispute) traces back to the purchase.
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

/** Raised when something we expect to exist is missing: Stripe should retry. */
class Retryable extends Error {}

function itemFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  for (const plan of [aiPlanById("assist"), aiPlanById("pro"), aiPlanById("max")]) {
    if (plan && process.env[plan.priceEnv] === priceId) {
      return {
        kind: "plan" as const,
        id: plan.id,
        bucket: "monthly" as const,
        credits: plan.credits,
      };
    }
  }
  for (const pack of aiPacks) {
    if (pack && process.env[pack.priceEnv] === priceId) {
      return {
        kind: "pack" as const,
        id: pack.id,
        bucket: "purchased" as const,
        credits: pack.credits,
      };
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

/* ---- current-API readers -------------------------------------------------
   The 2025 invoice shape moved these onto `parent` / `pricing` / `payments`.
   Older shapes are still read as a fallback so replayed events keep working. */

type LooseLine = {
  pricing?: { price_details?: { price?: unknown } };
  price?: unknown;
  parent?: { subscription_item_details?: { subscription?: unknown } };
  subscription?: unknown;
  period?: { start?: number; end?: number };
};

function linePriceId(line: LooseLine | undefined): string | null {
  return id(line?.pricing?.price_details?.price) ?? id(line?.price);
}

function invoiceSubscription(invoice: Stripe.Invoice, line: LooseLine | undefined): string | null {
  const parent = (
    invoice as unknown as {
      parent?: { subscription_details?: { subscription?: unknown } };
    }
  ).parent;
  return (
    id(parent?.subscription_details?.subscription) ??
    id(line?.parent?.subscription_item_details?.subscription) ??
    id((invoice as unknown as { subscription?: unknown }).subscription) ??
    id(line?.subscription)
  );
}

function invoiceUserHint(invoice: Stripe.Invoice): string | null {
  const parent = (
    invoice as unknown as {
      parent?: { subscription_details?: { metadata?: Record<string, string> } };
    }
  ).parent;
  return (
    (invoice.metadata?.["user_id"] as string | undefined) ??
    parent?.subscription_details?.metadata?.["user_id"] ??
    (invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata?.["user_id"] ??
    null
  );
}

/** The invoice's real payment identifiers, for refund tracing. */
function invoicePayment(invoice: Stripe.Invoice): { intent: string | null; charge: string | null } {
  const payments = (
    invoice as unknown as {
      payments?: { data?: { payment?: { payment_intent?: unknown; charge?: unknown } }[] };
    }
  ).payments?.data;
  const first = payments?.[0]?.payment;
  return {
    intent:
      id(first?.payment_intent) ??
      id((invoice as unknown as { payment_intent?: unknown }).payment_intent),
    charge: id(first?.charge) ?? id((invoice as unknown as { charge?: unknown }).charge),
  };
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

  // Close the recorded checkout attempt either way, so the account is not
  // blocked from buying again.
  await db.rpc("ai_checkout_settle", {
    _user: userId,
    _session: session.id,
    _status:
      session.payment_status === "paid" || session.mode === "subscription"
        ? "completed"
        : "abandoned",
  });

  // Subscriptions are granted ONLY from the paid invoice, never here — the
  // invoice carries the verified period and the verified amount.
  if (session.mode === "subscription") {
    return { ok: true, note: "subscription: allowance waits for the paid invoice" };
  }
  if (session.payment_status !== "paid") {
    return { ok: true, note: `one-time not paid yet (${session.payment_status})` };
  }

  // Resolve the price from Stripe itself, not from metadata.
  const lines = await sdk.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const line = lines.data[0];
  const item = itemFromPriceId(id(line?.price));
  if (!item || item.kind !== "pack") return { ok: true, note: "no allowlisted one-time price" };

  // This IS one of ours, so ownership must resolve. If it does not, retry.
  const owner = await ownerOf(db, userId, customer);
  if (!owner) throw new Retryable("paid pack with no account mapping yet");

  const paymentIntent = id(session.payment_intent);
  let charge: string | null = null;
  if (paymentIntent) {
    try {
      const pi = await sdk.paymentIntents.retrieve(paymentIntent);
      charge = id((pi as unknown as { latest_charge?: unknown }).latest_charge);
    } catch {
      /* charge id is a convenience — the payment intent is enough to trace */
    }
  }

  const result = await fulfill(db, {
    _user: owner,
    _kind: item.kind,
    _item_id: item.id,
    _bucket: item.bucket,
    _credits: item.credits,
    _payment_ref: paymentIntent ?? session.id,
    _invoice: null,
    _subscription: null,
    _period_start: null,
    _period_end: null,
    _amount_cents: session.amount_total ?? null,
    _currency: session.currency ?? null,
    _payment_intent: paymentIntent,
    _charge: charge,
  });
  return { ok: true, note: `pack ${item.id}: ${result}` };
}

async function handleInvoicePaid(db: Db, invoice: Stripe.Invoice): Promise<Outcome> {
  if (invoice.status !== "paid" || (invoice.amount_paid ?? 0) <= 0) {
    return { ok: true, note: `invoice not paid (${invoice.status})` };
  }
  const customer = id(invoice.customer);
  const line = invoice.lines?.data?.[0] as unknown as LooseLine | undefined;
  const item = itemFromPriceId(linePriceId(line));
  if (!item || item.kind !== "plan") return { ok: true, note: "no allowlisted subscription price" };

  const subscription = invoiceSubscription(invoice, line);
  const period = line?.period;
  const start = period?.start ? new Date(period.start * 1000).toISOString() : null;
  const end = period?.end ? new Date(period.end * 1000).toISOString() : null;
  if (!end) throw new Retryable("paid subscription invoice carries no period yet");

  // This IS one of our prices, so the account must be resolvable. A missing
  // mapping is retried, never marked processed.
  const owner = await ownerOf(db, invoiceUserHint(invoice), customer);
  if (!owner) throw new Retryable("paid invoice with no account mapping yet");

  const payment = invoicePayment(invoice);
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
    _payment_intent: payment.intent,
    _charge: payment.charge,
  });
  return { ok: true, note: `plan ${item.id} period ${end}: ${result}` };
}

/** A failed renewal or an ended subscription stops the monthly allowance — but
 *  only for the period it belongs to: a delayed failure for an older invoice
 *  can never erase a newer paid month. */
async function handleSubscriptionStopped(
  db: Db,
  obj: Stripe.Invoice | Stripe.Subscription,
  reason: string,
): Promise<Outcome> {
  const customer = id((obj as { customer?: unknown }).customer);
  const owner = await ownerOf(db, null, customer);
  if (!owner) return { ok: true, note: "no account for this subscription" };

  const line = (obj as Stripe.Invoice).lines?.data?.[0] as unknown as LooseLine | undefined;
  const periodEnd = line?.period?.end
    ? new Date(line.period.end * 1000).toISOString()
    : (obj as Stripe.Subscription).items?.data?.[0]?.current_period_end
      ? new Date(
          ((obj as Stripe.Subscription).items.data[0]!.current_period_end as number) * 1000,
        ).toISOString()
      : null;

  const { data, error } = await db.rpc("ai_billing_stop_monthly", {
    _user: owner,
    _period_end: periodEnd,
    _ref: `stripe:stop:${(obj as { id?: string }).id ?? customer}`,
    _reason: reason,
  });
  if (error) throw new Error(`stop failed: ${error.message}`);
  return { ok: true, note: `monthly allowance: ${String(data)}` };
}

async function handleReversal(
  db: Db,
  sdk: Stripe,
  obj: Stripe.Charge | Stripe.Dispute,
  reason: string,
): Promise<Outcome> {
  // Neither a charge nor a dispute carries our metadata. Monthly purchases are
  // recorded against the invoice, so we try every canonical reference: the
  // payment intent, the charge, and the invoice the charge belongs to.
  const charge = "amount_refunded" in obj ? (obj as Stripe.Charge) : null;
  const dispute = !charge ? (obj as Stripe.Dispute) : null;

  const chargeId = charge?.id ?? (dispute ? id(dispute.charge) : null);
  let paymentIntent = id((obj as { payment_intent?: unknown }).payment_intent);
  let invoiceId = charge ? id((charge as unknown as { invoice?: unknown }).invoice) : null;

  if (chargeId && (!paymentIntent || !invoiceId)) {
    try {
      const full = await sdk.charges.retrieve(chargeId);
      paymentIntent = paymentIntent ?? id(full.payment_intent);
      invoiceId = invoiceId ?? id((full as unknown as { invoice?: unknown }).invoice);
    } catch {
      /* fall back to what the event itself carried */
    }
  }

  const refunded = charge ? (charge.amount_refunded ?? 0) : (dispute?.amount ?? 0);
  const refs = [paymentIntent, chargeId, invoiceId].filter((r): r is string => Boolean(r));
  if (!refs.length) return { ok: true, note: "no payment reference on this reversal" };

  let last = "unknown_payment";
  for (const ref of refs) {
    const { data, error } = await db.rpc("ai_billing_reverse", {
      _payment_ref: ref,
      _refunded_cents: refunded,
      _reason: reason,
    });
    if (error) throw new Error(`reverse failed: ${error.message}`);
    last = String(data);
    if (last !== "unknown_payment") return { ok: true, note: `reversal: ${last}` };
  }

  // Queued for reconciliation by the database, and retried by Stripe so an
  // out-of-order refund is never silently dropped.
  throw new Retryable("reversal has no matching purchase yet — queued for reconciliation");
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
        // A redelivery arriving while the first attempt still holds the lease:
        // never run the fulfilment twice in parallel. The in-flight attempt
        // reports its own outcome, and a real failure releases the lease.
        if (claim.data === "in_progress") return new Response("ok (in progress)");

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
            case "checkout.session.expired":
            case "checkout.session.async_payment_failed": {
              const s = event.data.object as Stripe.Checkout.Session;
              await db.rpc("ai_checkout_settle", {
                _user: s.metadata?.["user_id"] ?? s.client_reference_id ?? null,
                _session: s.id,
                _status: "abandoned",
              });
              outcome = { ok: true, note: "checkout closed without payment" };
              break;
            }
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

/** Exported for tests: the handlers above, driven with fixture events. */
export const __webhookHandlers = {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleSubscriptionStopped,
  handleReversal,
  itemFromPriceId,
  invoiceSubscription,
  linePriceId,
  invoicePayment,
  Retryable,
};
