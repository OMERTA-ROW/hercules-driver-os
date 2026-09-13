import { describe, expect, it, vi, beforeEach } from "vitest";
import Stripe from "stripe";

/* --------------------------------------------------------------------------
 * Paid operations are owned by ONE execution claim held in the database, so the
 * guarantee survives two independent server instances. These tests simulate the
 * claim/settle routines faithfully (shared store, leases, hold states) and prove:
 *   - concurrent identical requests => one provider call, one debit
 *   - a SETTLED prior claim => no provider call at all, no new charge
 *   - a REFUNDED hold => a retry must take a NEW hold before it may run
 *   - provider failure => full refund, no debit
 *   - an abandoned lease is recoverable without gifting a free call
 * ------------------------------------------------------------------------ */

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];

type Claim = {
  user: string;
  action: string;
  status: "running" | "done" | "failed";
  reservation: string | null;
  charged: number;
  attempts: number;
  lease: number;
};
type Res = { id: string; amount: number; status: "reserved" | "committed" | "refunded" };

const claims = new Map<string, Claim>();
const reservations = new Map<string, Res>();
let balance = 1000;
let seq = 0;

function reserveHold(amount: number): Res {
  if (balance < amount) throw new Error("insufficient_credits");
  balance -= amount;
  const r: Res = { id: `res-${++seq}`, amount, status: "reserved" };
  reservations.set(r.id, r);
  return r;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const idem = String(args["_idem"] ?? "");
      if (fn === "ai_exec_claim") {
        const amount = Number(args["_amount"]);
        const existing = claims.get(idem);
        if (!existing) {
          let hold: Res;
          try {
            hold = reserveHold(amount);
          } catch {
            return { data: { outcome: "insufficient" }, error: null };
          }
          claims.set(idem, {
            user: String(args["_user"]),
            action: String(args["_action"]),
            status: "running",
            reservation: hold.id,
            charged: 0,
            attempts: 1,
            lease: Date.now() + 60_000,
          });
          return { data: { outcome: "owner", reservation: hold.id, amount }, error: null };
        }
        if (existing.status === "done") {
          return { data: { outcome: "done", charged: existing.charged }, error: null };
        }
        if (existing.status === "running" && existing.lease > Date.now()) {
          return { data: { outcome: "pending" }, error: null };
        }
        const prior = existing.reservation ? reservations.get(existing.reservation) : undefined;
        if (prior?.status === "committed") {
          existing.status = "done";
          existing.charged = prior.amount;
          return { data: { outcome: "done", charged: prior.amount }, error: null };
        }
        if (prior?.status === "reserved") {
          existing.status = "running";
          existing.attempts += 1;
          existing.lease = Date.now() + 60_000;
          return {
            data: { outcome: "owner", reservation: prior.id, amount: prior.amount },
            error: null,
          };
        }
        let fresh: Res;
        try {
          fresh = reserveHold(amount);
        } catch {
          return { data: { outcome: "insufficient" }, error: null };
        }
        existing.status = "running";
        existing.reservation = fresh.id;
        existing.attempts += 1;
        existing.lease = Date.now() + 60_000;
        return { data: { outcome: "owner", reservation: fresh.id, amount }, error: null };
      }
      if (fn === "ai_exec_finish") {
        const c = claims.get(idem);
        if (!c) return { data: null, error: { message: "claim_not_found" } };
        const r = c.reservation ? reservations.get(c.reservation) : undefined;
        if (!args["_ok"]) {
          if (r?.status === "reserved") {
            r.status = "refunded";
            balance += r.amount;
          }
          c.status = "failed";
          c.lease = 0;
          return { data: { status: "failed", charged: 0 }, error: null };
        }
        if (r?.status !== "reserved") {
          c.status = "done";
          c.charged = 0;
          return { data: { status: "unsettled", charged: 0 }, error: null };
        }
        r.status = "committed";
        c.status = "done";
        c.charged = r.amount;
        return { data: { status: "settled", charged: r.amount }, error: null };
      }
      return { data: 0, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { quality_pref: "balanced" } }) }),
      }),
    }),
  },
}));

/** A fresh module copy behaves like a second, independent server instance:
 *  its in-memory de-duplication map is empty, so only the database claim can
 *  stop it from calling the paid provider again. */
async function instance() {
  vi.resetModules();
  return import("@/lib/ai-meter.server");
}

describe("metered operations", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    claims.clear();
    reservations.clear();
    balance = 1000;
    seq = 0;
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
    // Same instance: all three share the one operation, so one charge only.
    expect(results.every((r) => r.ok)).toBe(true);
    expect(rpcCalls.filter((c) => c.fn === "ai_exec_claim")).toHaveLength(1);
    expect(rpcCalls.filter((c) => c.fn === "ai_exec_finish")).toHaveLength(1);
    expect(balance).toBe(996);
  });

  it("two independent instances racing the same request make ONE paid call", async () => {
    const a = await instance();
    const b = await instance();
    let providerCalls = 0;
    const job = (m: typeof a) =>
      m.runMetered<string>({
        userId: "user-1",
        action: "speech_premium",
        cost: 4,
        identity: "cross-instance",
        run: async () => {
          providerCalls += 1;
          await new Promise((r) => setTimeout(r, 25));
          return "audio";
        },
      });

    const [r1, r2] = await Promise.all([job(a), job(b)]);
    expect(providerCalls).toBe(1);
    // The second instance is told to wait; it never touches the provider.
    const outcomes = [r1, r2].map((r) => (r.ok ? "ok" : r.reason));
    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    expect(outcomes).toContain("pending");
    expect(balance).toBe(996);
  });

  it("a settled prior claim is never run again and is never charged again", async () => {
    const a = await instance();
    let providerCalls = 0;
    const job = (m: typeof a) =>
      m.runMetered<string>({
        userId: "user-1",
        action: "speech_premium",
        cost: 4,
        identity: "settled-already",
        run: async () => {
          providerCalls += 1;
          return "audio";
        },
      });

    const first = await job(a);
    expect(first.ok).toBe(true);
    const b = await instance();
    const second = await job(b);
    expect(providerCalls).toBe(1);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.reason).toBe("already_served");
    expect(balance).toBe(996);
  });

  it("a refunded hold cannot fund a second paid call — a new hold is taken", async () => {
    const a = await instance();
    let providerCalls = 0;
    const job = (m: typeof a, fail: boolean) =>
      m.runMetered<string>({
        userId: "user-1",
        action: "speech_premium",
        cost: 4,
        identity: "refunded-then-retried",
        run: async () => {
          providerCalls += 1;
          if (fail) throw new Error("provider down");
          return "audio";
        },
      });

    const failed = await job(a, true);
    expect(failed.ok).toBe(false);
    expect(balance).toBe(1000); // fully refunded

    const b = await instance();
    const retry = await job(b, false);
    expect(retry.ok).toBe(true);
    expect(providerCalls).toBe(2);
    expect(reservations.size).toBe(2); // a NEW hold, not the refunded one
    expect(balance).toBe(996); // exactly one debit
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
    expect(
      rpcCalls.filter((c) => c.fn === "ai_exec_finish" && c.args["_ok"] === false),
    ).toHaveLength(1);
    expect(balance).toBe(1000);
  });

  it("an abandoned lease is recovered on the existing hold, with no extra spend", async () => {
    const a = await instance();
    // Simulate a crashed owner: claim left running with an expired lease.
    const hold = reserveHold(4);
    claims.set("stale-lease", {
      user: "user-1",
      action: "speech_premium",
      status: "running",
      reservation: hold.id,
      charged: 0,
      attempts: 1,
      lease: Date.now() - 1000,
    });
    const result = await a.runMetered<string>({
      userId: "user-1",
      action: "speech_premium",
      cost: 4,
      identity: "stale-lease",
      run: async () => "audio",
    });
    expect(result.ok).toBe(true);
    expect(reservations.size).toBe(1); // reused the abandoned hold
    expect(balance).toBe(996);
  });

  it("refuses when the account cannot cover the cost", async () => {
    balance = 1;
    const a = await instance();
    let providerCalls = 0;
    const result = await a.runMetered<string>({
      userId: "user-1",
      action: "speech_premium",
      cost: 4,
      identity: "too-poor",
      run: async () => {
        providerCalls += 1;
        return "audio";
      },
    });
    expect(result.ok).toBe(false);
    expect(providerCalls).toBe(0);
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
    const event = await sdk.webhooks.constructEventAsync(
      payload,
      sign(payload),
      secret,
      undefined,
      crypto,
    );
    expect(event.id).toBe("evt_1");
  });

  it("rejects a tampered body", async () => {
    const header = sign(payload);
    await expect(
      sdk.webhooks.constructEventAsync(
        payload.replace("evt_1", "evt_2"),
        header,
        secret,
        undefined,
        crypto,
      ),
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
