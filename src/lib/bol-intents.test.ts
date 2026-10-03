import { describe, expect, it } from "vitest";
import { bolIntent } from "./bol-intents";
import { isSafeEmailRecipient } from "@/components/hercules/BolWorkspace";
import { missingBolFields, type BolDraft } from "./bol";
import { createClient } from "@supabase/supabase-js";

const filled: BolDraft = {
  id: null, loadId: null, loadReference: "LD-1", carrierName: "Carrier", vehicleUnit: "12",
  shipperName: "Shipper", shipperAddress: "1 Main", consigneeName: "Receiver",
  consigneeAddress: "2 Main", pickupDetails: "Oct 3", deliveryDetails: "Oct 4",
  items: [{ description: "Pallets", handlingUnits: "2", weight: "1200", weightUnit: "lb" }],
  freightInstructions: "", status: "draft", updatedAt: null,
};

describe("BOL deterministic commands", () => {
  it.each([
    ["create a BOL", "create"], ["open my bill of lading", "open"],
    ["print this BOL", "print"], ["email this bol", "email"],
  ])("matches %s", (text, expected) => expect(bolIntent(text)).toBe(expected));

  it.each(["send it", "print paperwork", "email broker", "make a document", "BOL maybe"])(
    "does not execute ambiguous phrase %s", (text) => expect(bolIntent(text)).toBe("none"),
  );
});

describe("BOL validation", () => {
  it("reports no missing core fields for a filled draft", () => expect(missingBolFields(filled)).toEqual([]));
  it("names unknown shipment facts", () => expect(missingBolFields({ ...filled, shipperName: "", items: [{ ...filled.items[0]!, weight: "" }] })).toEqual(["shipper name", "freight weight"]));
  it("accepts one safe recipient and rejects malformed or injected values", () => {
    expect(isSafeEmailRecipient("driver@example.com")).toBe(true);
    expect(isSafeEmailRecipient("driver@example.com\nBcc:x@example.com")).toBe(false);
    expect(isSafeEmailRecipient("not-an-email")).toBe(false);
  });
});

const url = process.env["VITE_SUPABASE_URL"] ?? "";
const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
describe.runIf(Boolean(url && key))("BOL document ownership", () => {
  it("does not expose or create BOL drafts for a signed-out visitor", async () => {
    const anon = createClient(url, key, { auth: { persistSession: false } });
    const read = await anon.from("documents").select("id, bol_data").eq("kind", "bol_draft").limit(1);
    expect(read.error ? true : (read.data ?? []).length === 0).toBe(true);
    const write = await anon.from("documents").insert({
      owner_id: "00000000-0000-4000-8000-0000000000aa",
      kind: "bol_draft",
      title: "Forbidden draft",
      bol_data: {},
    });
    expect(write.error).toBeTruthy();
  });
});