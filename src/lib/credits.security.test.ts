import { describe, expect, it } from "vitest";

/**
 * INTEGRATION ASSERTION — credit accounting is server-owned.
 *
 * These run against the real database with the public (browser) key, i.e. what
 * any signed-in driver could send. Reserving, settling and refunding credits
 * must be refused outright, even for the caller's own account, and the ledger
 * and usage tables must refuse direct writes.
 */

const url = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const key =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

const configured = Boolean(url && key);

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return { status: res.status, body: await res.text() };
}

async function insert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
  return { status: res.status, body: await res.text() };
}

const OWN = "00000000-0000-4000-8000-0000000000aa";

describe.skipIf(!configured)("clients cannot move their own AI credits", () => {
  it("refuses ai_credits_reserve", async () => {
    const r = await rpc("ai_credits_reserve", { _user: OWN, _action: "speech", _amount: 1 });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.body).not.toContain("monthly_amount");
  });

  it("refuses ai_credits_commit — no zero-charge settlement of a live hold", async () => {
    const r = await rpc("ai_credits_commit", {
      _user: OWN,
      _reservation: OWN,
      _charge: 0,
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses ai_credits_refund", async () => {
    const r = await rpc("ai_credits_refund", { _user: OWN, _reservation: OWN, _reason: "x" });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses ai_credits_grant, revoke and touch", async () => {
    for (const [fn, args] of [
      ["ai_credits_grant", { _user: OWN, _bucket: "purchased", _amount: 9999, _ref: "x", _reason: "x" }],
      ["ai_credits_revoke", { _user: OWN, _bucket: "purchased", _amount: 1, _ref: "y", _reason: "y" }],
      ["ai_credits_touch", { _user: OWN }],
    ] as const) {
      const r = await rpc(fn, args as Record<string, unknown>);
      expect(r.status, fn).toBeGreaterThanOrEqual(400);
    }
  });

  it("refuses direct writes to wallets, ledger, reservations and usage", async () => {
    for (const table of [
      "ai_credit_wallets",
      "ai_credit_ledger",
      "ai_credit_reservations",
      "ai_usage_events",
    ]) {
      const r = await insert(table, { user_id: OWN });
      expect(r.status, table).toBeGreaterThanOrEqual(400);
    }
  });
});
