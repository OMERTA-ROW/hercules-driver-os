import { createFileRoute } from "@tanstack/react-router";
import { aiPackById, aiPlanById } from "@/data/ai-credits";

/**
 * THE ONLY PLACE CREDITS ARE EVER ADDED.
 *
 * Signed, raw-body payment webhook. Nothing here trusts the browser: the
 * account comes from the payment object's metadata, the amount comes from our
 * own server-side catalogue, and every event is written to `billing_events`
 * first — that table's unique key makes replayed, delayed or out-of-order
 * deliveries harmless.
 */

const TOLERANCE_SECONDS = 300;

async function verify(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k?.trim() ?? "", v.join("=")];
    }),
  );
  const t = Number(parts["t"]);
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

type Meta = Record<string, string | undefined>;

function creditsFor(kind: string | undefined, itemId: string | undefined) {
  if (!itemId) return null;
  if (kind === "plan") {
    const plan = aiPlanById(itemId);
    return plan ? { bucket: "monthly" as const, amount: plan.credits, planId: plan.id } : null;
  }
  const pack = aiPackById(itemId);
  return pack ? { bucket: "purchased" as const, amount: pack.credits, planId: null } : null;
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const ok = await verify(raw, request.headers.get("stripe-signature"), secret);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        if (!event.id || !event.type) return new Response("Bad payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as never as {
          from: (t: string) => {
            insert: (r: Record<string, unknown>) => Promise<{ error: { code?: string } | null }>;
            update: (r: Record<string, unknown>) => {
              eq: (c: string, v: unknown) => Promise<{ error: unknown }>;
            };
          };
          rpc: (f: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };

        // Idempotency gate: a duplicate delivery loses the insert and stops here.
        const claim = await db
          .from("billing_events")
          .insert({ provider: "stripe", event_id: event.id, type: event.type, payload: event });
        if (claim.error) {
          if (claim.error.code === "23505") return new Response("ok (duplicate)");
          console.error(`[webhook] could not record event: ${JSON.stringify(claim.error)}`);
          return new Response("Storage error", { status: 500 });
        }

        const obj = event.data?.object ?? {};
        const meta = ((obj["metadata"] as Meta) ?? {}) as Meta;
        const userId = meta["user_id"] ?? (obj["client_reference_id"] as string | undefined);

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              if ((obj["payment_status"] as string) !== "paid") break;
              const grant = creditsFor(meta["kind"], meta["item_id"]);
              if (!userId || !grant) break;

              const customer = obj["customer"] as string | undefined;
              if (customer) {
                await db.from("profiles").update({ stripe_customer_id: customer }).eq("id", userId);
              }

              await db.rpc("ai_credits_grant", {
                _user: userId,
                _bucket: grant.bucket,
                _amount: grant.amount,
                _ref: `stripe:${event.id}`,
                _reason:
                  grant.bucket === "monthly"
                    ? "Monthly AI allowance"
                    : "Credit pack purchase (never expires)",
                _expires: grant.bucket === "monthly" ? monthAhead() : null,
                _plan_id: grant.planId,
                _renews_at: grant.bucket === "monthly" ? monthAhead() : null,
              });
              break;
            }

            // Each successful renewal replenishes the monthly allowance once.
            case "invoice.paid": {
              const lines = (obj["lines"] as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
              const line = lines[0] ?? {};
              const lineMeta = ((line["metadata"] as Meta) ?? {}) as Meta;
              const subMeta = ((obj["subscription_details"] as { metadata?: Meta } | undefined)?.metadata ??
                {}) as Meta;
              const uid = subMeta["user_id"] ?? lineMeta["user_id"] ?? userId;
              const itemId = subMeta["item_id"] ?? lineMeta["item_id"] ?? meta["item_id"];
              const grant = creditsFor("plan", itemId);
              if (!uid || !grant) break;
              const period = (line["period"] as { end?: number } | undefined)?.end;
              const expires = period ? new Date(period * 1000).toISOString() : monthAhead();
              await db.rpc("ai_credits_grant", {
                _user: uid,
                _bucket: "monthly",
                _amount: grant.amount,
                _ref: `stripe:${event.id}`,
                _reason: "Monthly AI allowance renewed",
                _expires: expires,
                _plan_id: grant.planId,
                _renews_at: expires,
              });
              break;
            }

            // Payment failed or subscription ended: the allowance simply stops.
            case "invoice.payment_failed":
            case "customer.subscription.deleted": {
              const subMeta = ((obj["metadata"] as Meta) ?? {}) as Meta;
              const uid = subMeta["user_id"] ?? userId;
              const itemId = subMeta["item_id"] ?? meta["item_id"];
              const grant = creditsFor("plan", itemId);
              if (!uid) break;
              await db.rpc("ai_credits_revoke", {
                _user: uid,
                _bucket: "monthly",
                _amount: grant?.amount ?? 1_000_000,
                _ref: `stripe:${event.id}`,
                _reason:
                  event.type === "invoice.payment_failed"
                    ? "Renewal payment failed — monthly allowance stopped"
                    : "AI subscription ended — monthly allowance stopped",
              });
              break;
            }

            // Refund or dispute: take back what that payment granted.
            case "charge.refunded":
            case "charge.dispute.created": {
              const uid = meta["user_id"];
              const grant = creditsFor(meta["kind"], meta["item_id"]);
              if (!uid || !grant) break;
              await db.rpc("ai_credits_revoke", {
                _user: uid,
                _bucket: grant.bucket,
                _amount: grant.amount,
                _ref: `stripe:${event.id}`,
                _reason: "Payment reversed — credits removed",
              });
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error(`[webhook] handling ${event.type} failed: ${String(e)}`);
          return new Response("Handler error", { status: 500 });
        }

        await db
          .from("billing_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("event_id", event.id);

        return new Response("ok");
      },
    },
  },
});

function monthAhead() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}
