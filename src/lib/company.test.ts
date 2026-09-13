import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { joinErrorMessage } from "@/lib/company";
import * as accounts from "@/data/accounts";

const URL = process.env["VITE_SUPABASE_URL"] ?? "";
const KEY = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
const live = !!URL && !!KEY;

describe("company membership", () => {
  it("has no client-side carrier directory or code minting left", () => {
    const keys = Object.keys(accounts);
    expect(keys).not.toContain("knownCompanies");
    expect(keys).not.toContain("companyByCode");
    expect(keys).not.toContain("makeCompanyCode");
  });

  it("explains every refusal the database can return in plain language", () => {
    for (const code of [
      "unknown_code",
      "expired",
      "revoked",
      "used_up",
      "wrong_email",
      "not_signed_in",
      "not_permitted",
      "owner_only",
      "last_owner",
    ]) {
      const msg = joinErrorMessage(code);
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toContain("_");
    }
    expect(joinErrorMessage("something_new")).toMatch(/Nothing was changed/);
  });
});

describe.runIf(live)("company tables are closed to signed-out visitors", () => {
  const anon = createClient(URL, KEY, { auth: { persistSession: false } });

  it("refuses to create a company without a signed-in account", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (anon.rpc as any)("company_create", { _name: "Anon Fleet" });
    const refused = !!error || (data && data.ok === false);
    expect(refused).toBe(true);
  });

  it("refuses to join a company without a signed-in account", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (anon.rpc as any)("company_join", { _code: "AAAAAAAA" });
    const refused = !!error || (data && data.ok === false);
    expect(refused).toBe(true);
  });

  it("cannot insert a membership directly", async () => {
    const { error } = await anon.from("company_members").insert({
      company_id: "00000000-0000-0000-0000-000000000000",
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "owner",
      status: "active",
    });
    expect(error).toBeTruthy();
  });

  it("reads no companies, memberships or invites", async () => {
    for (const table of ["companies", "company_members", "company_invites"] as const) {
      const { data, error } = await anon.from(table).select("id").limit(1);
      expect(error ? true : (data ?? []).length === 0).toBe(true);
    }
  });
});
