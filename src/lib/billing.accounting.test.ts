import { describe, expect, it, vi, beforeEach } from "vitest";
import Stripe from "stripe";

/* --------------------------------------------------------------------------
 * One metered operation per identical concurrent request set.
 * Two callers asking for the same line at the same time must produce exactly
 * ONE provider call and ONE debit — not one call and two debits.
 * ------------------------------------------------------------------------ */

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      if (fn === "ai_credits_reserve") {
        return { data: { id: `res-${rpcCalls.length}`, amount: args["_amount"] }, error: null };
      }
      return { data: 0, error: null };
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { quality_pref: "balanced" } }) }) }),
    }),
  },
}));

describe("metered operations", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
  });

  it("collapses identical concurrent requests into one provider call and one debit", async () => {
    const { runMetered } = await import("@/lib/ai-meter.server");
    let providerCalls = 0;

    const run = () =>
      runMetered<string>({
        userId: "user-1",
        action: "speech_premium",
        cost: 4,
        identity: "same-identity",
        run: async () => {
          providerCalls += 1;
          await new Promise((r) => setTimeout(r, 20));
          return "audio";
        },
      });

    const results = await Promise.all([run(), run(), run()]);

    expect(providerCalls).toBe(1);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(rpcCalls.filter((c) => c.fn === "ai_credits_reserve")).toHaveLength(1);
    expect(rpcCalls.filter((c) => c.fn === "ai_credits_commit")).toHaveLength(1);
  });

  it("returns the hold in full when the provider fails", async () => {
    const { runMetered } = await import("@/lib/ai-meter.server");
    const result = await runMetered({
      userId: "user-2",
      action: "speech_premium",
      cost: 4,
      identity: "failing-identity",
      run: async () => {
        throw new Error("provider down");
      },
    });
    expect(result.ok).toBe(false);
    expect(rpcCalls.filter((c) => c.fn === "ai_credits_refund")).toHaveLength(1);
    expect(rpcCalls.filter((c) => c.fn === "ai_credits_commit")).toHaveLength(0);
  });

  it("gives the same durable identity to a retry of the same request", async () => {
    const { requestIdentity } = await import("@/lib/ai-meter.server");
    const a = await requestIdentity("user-1", ["tts", "zeus", "Roll out"]);
    const b = await requestIdentity("user-1", ["tts", "zeus", "Roll out"]);
    const other = await requestIdentity("user-2", ["tts", "zeus", "Roll out"]);
    expect(a).toBe(b);
    expect(a).not.toBe(other);
  });
});

/* --------------------------------------------------------------------------
 * Webhook signature verification — real Stripe library, real signatures.
 * ------------------------------------------------------------------------ */

describe("stripe webhook signatures", () => {
  const secret = "whsec_test_secret_value";
  const sdk = new Stripe("sk_test_dummy", {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const crypto = Stripe.createSubtleCryptoProvider();

  const payload = JSON.stringify({ id: "evt_1", type: "invoice.paid", data: { object: {} } });

  function sign(body: string, ts = Math.floor(Date.now() / 1000)) {
    return sdk.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: ts });
  }

  it("accepts a correctly signed raw body", async () => {
    const event = await sdk.webhooks.constructEventAsync(payload, sign(payload), secret, undefined, crypto);
    expect(event.id).toBe("evt_1");
  });

  it("rejects a tampered body", async () => {
    const header = sign(payload);
    await expect(
      sdk.webhooks.constructEventAsync(payload.replace("evt_1", "evt_2"), header, secret, undefined, crypto),
    ).rejects.toThrow();
  });

  it("rejects a stale timestamp outside tolerance", async () => {
    const old = Math.floor(Date.now() / 1000) - 4000;
    await expect(
      sdk.webhooks.constructEventAsync(payload, sign(payload, old), secret, 300, crypto),
    ).rejects.toThrow();
  });

  it("rejects the wrong secret", async () => {
    await expect(
      sdk.webhooks.constructEventAsync(payload, sign(payload), "whsec_other", undefined, crypto),
    ).rejects.toThrow();
  });
});
