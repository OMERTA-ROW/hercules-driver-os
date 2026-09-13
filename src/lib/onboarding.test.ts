import { describe, expect, it } from "vitest";
import {
  defaultProfile,
  rulesFor,
  specFor,
  specKey,
  vehicleCatalog,
  type EighteenSub,
  type VehicleKind,
} from "@/data/vehicles";
import { TRIAL_DAYS } from "@/data/plans";

/**
 * Onboarding safety: a saved unit must come back out of the database as exactly
 * the same routing profile, a brand-new account must not be shown invented
 * equipment, and the trial length must be the one advertised.
 */
describe("equipment saved on an account round-trips", () => {
  it("recovers every catalogue entry from its stored equipment_type", () => {
    for (const spec of vehicleCatalog) {
      const stored = specKey(spec.kind, spec.sub);
      const [kind, sub] = stored.split(":");
      const back = specFor(kind as VehicleKind, sub as EighteenSub | undefined);
      expect(back.label).toBe(spec.label);
      expect(back.heightFt).toBe(spec.heightFt);
      expect(back.grossWeightLbs).toBe(spec.grossWeightLbs);
      expect(rulesFor(back).backRoadsAllowed).toBe(rulesFor(spec).backRoadsAllowed);
    }
  });

  it("falls back to a plainly generic template, never an invented unit number", () => {
    expect(defaultProfile.unit).toMatch(/no unit saved/i);
    expect(defaultProfile.unit).not.toMatch(/\d{3,}/);
  });
});

describe("the advertised trial", () => {
  it("is 7 days", () => {
    expect(TRIAL_DAYS).toBe(7);
  });
});
