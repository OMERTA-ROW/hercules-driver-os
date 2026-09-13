import { describe, expect, it, beforeEach } from "vitest";
import type Stripe from "stripe";
import { __webhookHandlers as H } from "@/routes/api/public/stripe-webhook";

/**
 * FUNCTIONAL handler tests: the real webhook handlers, driven with fixture
 * Stripe events and a recording database double. No network, no live keys, and
 * no live customer data.
 */

const PLAN_PRICE = "price_plan_pro_test";
const PACK_PRICE = "price_topup_100_test";

type Call = { fn: string; args: Record<string, unknown> };

function makeDb(behaviour: Partial<Record<string, unknown>> = {}) {
  const calls: Call[] = [];
  const db = {
    calls,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      const v = behaviour[fn];
      const data = typeof v === "function" ? (v as (a: Record<string, unknown>) => unknown)(args) : v;
      return { data: data ?? null, error: null };
    },
  };
  return db;
}

const sdk = {
  checkout: { sessions: { listLineItems: async () => ({ data: [{ price: { id: PACK_PRICE } }] }) } },
  paymentIntents: { retrieve: async () => ({ latest_charge: "ch_pack" }) },
  charges: { retrieve: async () => ({ payment_intent: "pi_month", invoice: "in_1" }) },
} as unknown as Stripe;

function invoicePaid(over: Record<string, unknown> = {}) {
  return {
    id: "in_1",
    status: "paid",
    amount_paid: 2900,
    currency: "usd",
    customer: "cus_1",
    parent: { subscription_details: { subscription: "sub_1", metadata: {} } },
    payments: { data: [{ payment: { payment_intent: "pi_month", charge: "ch_month" } }] },
    lines: {
      data: [
        {
          pricing: { price_details: { price: PLAN_PRICE } },
          parent: { subscription_item_details: { subscription: "sub_1" } },
          period: { start: 1_760_000_000, end: 1_762_600_000 },
        },
      ],
    },
    ...over,
  } as unknown as Stripe.Invoice;
}

beforeEach(() => {
  process.env["STRIPE_PRICE_AI_PRO"] = PLAN_PRICE;
  process.env["STRIPE_PRICE_AI_TOPUP_100"] = PACK_PRICE;
});

describe("current Stripe invoice shape", () => {
  it("reads price, subscription and payment from the 2025 fields", () => {
    const inv = invoicePaid();
    const line = inv.lines.data[0] as never;
    expect(H.linePriceId(line)).toBe(PLAN_PRICE);
    expect(H.invoiceSubscription(inv, line)).toBe("sub_1");
    expect(H.invoicePayment(inv)).toEqual({ intent: "pi_month", charge: "ch_month" });
  });

  it("still reads the older shape", () => {
    const inv = invoicePaid({
      parent: undefined,
      subscription: "sub_old",
      payments: undefined,
      payment_intent: "pi_old",
      lines: { data: [{ price: { id: PLAN_PRICE }, period: { start: 1, end: 2 } }] },
    });
    const line = inv.lines.data[0] as never;
    expect(H.linePriceId(line)).toBe(PLAN_PRICE);
    expect(H.invoiceSubscription(inv, line)).toBe("sub_old");
    expect(H.invoicePayment(inv).intent).toBe("pi_old");
  });
});

describe("invoice arriving before checkout completion", () => {
  it("is retried, not marked processed and lost", async () => {
    const db = makeDb({ ai_billing_owner_of_customer: null });
    await expect(H.handleInvoicePaid(db as never, invoicePaid())).rejects.toThrow(/no account mapping/);
    expect(db.calls.some((c) => c.fn === "ai_billing_fulfill")).toBe(false);
  });

  it("grants once the mapping exists, with the invoice's real period", async () => {
    const db = makeDb({ ai_billing_owner_of_customer: "user-1", ai_billing_fulfill: "granted" });
    const out = await H.handleInvoicePaid(db as never, invoicePaid());
    expect(out.note).toContain("granted");
    const call = db.calls.find((c) => c.fn === "ai_billing_fulfill")!;
    expect(call.args["_bucket"]).toBe("monthly");
    expect(call.args["_payment_ref"]).toBe("in_1");
    expect(call.args["_payment_intent"]).toBe("pi_month");
    expect(call.args["_period_end"]).toBe(new Date(1_762_600_000 * 1000).toISOString());
  });
});

describe("checkout completion plus first invoice = ONE monthly grant", () => {
  it("subscription completion never grants credits itself", async () => {
    const db = makeDb({});
    const session = {
      id: "cs_1",
      mode: "subscription",
      customer: "cus_1",
      subscription: "sub_1",
      payment_status: "paid",
      metadata: { user_id: "user-1" },
    } as unknown as Stripe.Checkout.Session;
    const out = await H.handleCheckoutCompleted(db as never, sdk, session);
    expect(out.note).toContain("waits for the paid invoice");
    expect(db.calls.some((c) => c.fn === "ai_billing_fulfill")).toBe(false);
    expect(db.calls.some((c) => c.fn === "ai_billing_link_customer")).toBe(true);
    expect(db.calls.some((c) => c.fn === "ai_checkout_settle")).toBe(true);
  });

  it("a duplicate invoice for the same period is answered 'duplicate'", async () => {
    const db = makeDb({ ai_billing_owner_of_customer: "user-1", ai_billing_fulfill: "duplicate" });
    const out = await H.handleInvoicePaid(db as never, invoicePaid());
    expect(out.note).toContain("duplicate");
  });
});

describe("one-time pack", () => {
  it("records the payment intent and charge for later refund tracing", async () => {
    const db = makeDb({ ai_billing_owner_of_customer: "user-1", ai_billing_fulfill: "granted" });
    const session = {
      id: "cs_2",
      mode: "payment",
      customer: "cus_1",
      payment_status: "paid",
      payment_intent: "pi_pack",
      amount_total: 2500,
      currency: "usd",
      metadata: { user_id: "user-1" },
    } as unknown as Stripe.Checkout.Session;
    const out = await H.handleCheckoutCompleted(db as never, sdk, session);
    expect(out.note).toContain("granted");
    const call = db.calls.find((c) => c.fn === "ai_billing_fulfill")!;
    expect(call.args["_payment_ref"]).toBe("pi_pack");
    expect(call.args["_charge"]).toBe("ch_pack");
    expect(call.args["_bucket"]).toBe("purchased");
  });
});

describe("monthly refund mapping", () => {
  it("tries payment intent, charge and invoice until the purchase is found", async () => {
    const db = makeDb({
      ai_billing_reverse: (a: Record<string, unknown>) =>
        a["_payment_ref"] === "in_1" ? "reversed" : "unknown_payment",
    });
    const charge = {
      id: "ch_month",
      amount_refunded: 2900,
      payment_intent: "pi_month",
    } as unknown as Stripe.Charge;
    const out = await H.handleReversal(db as never, sdk, charge, "refund");
    expect(out.note).toContain("reversed");
    const refs = db.calls.filter((c) => c.fn === "ai_billing_reverse").map((c) => c.args["_payment_ref"]);
    expect(refs).toContain("in_1");
  });

  it("a second identical refund is 'already_reversed', not a second removal", async () => {
    const db = makeDb({ ai_billing_reverse: "already_reversed" });
    const charge = { id: "ch_x", amount_refunded: 2900, payment_intent: "pi_x" } as unknown as Stripe.Charge;
    const out = await H.handleReversal(db as never, sdk, charge, "refund");
    expect(out.note).toContain("already_reversed");
  });

  it("a partial refund passes the real refunded amount through", async () => {
    const db = makeDb({ ai_billing_reverse: "reversed" });
    const charge = { id: "ch_p", amount_refunded: 1000, payment_intent: "pi_p" } as unknown as Stripe.Charge;
    await H.handleReversal(db as never, sdk, charge, "refund");
    expect(db.calls[0]!.args["_refunded_cents"]).toBe(1000);
  });

  it("an unmatched refund stays retryable instead of processed", async () => {
    const db = makeDb({ ai_billing_reverse: "unknown_payment" });
    const charge = { id: "ch_u", amount_refunded: 100, payment_intent: "pi_u" } as unknown as Stripe.Charge;
    await expect(H.handleReversal(db as never, sdk, charge, "refund")).rejects.toThrow(/reconciliation/);
  });
});

describe("old failure after a new renewal", () => {
  it("stops the allowance only for the period that failed", async () => {
    const db = makeDb({ ai_billing_owner_of_customer: "user-1", ai_billing_stop_monthly: "stale" });
    const out = await H.handleSubscriptionStopped(
      db as never,
      invoicePaid({ status: "open", amount_paid: 0 }),
      "renewal failed",
    );
    expect(out.note).toContain("stale");
    const call = db.calls.find((c) => c.fn === "ai_billing_stop_monthly")!;
    expect(call.args["_period_end"]).toBe(new Date(1_762_600_000 * 1000).toISOString());
  });
});
