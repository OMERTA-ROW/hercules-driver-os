import { describe, expect, it } from "vitest";
import { requireRoutingProfile, rowToProfile, validateVehicleDims, type VehicleDims } from "./vehicle-profile";
import { routingPayload } from "@/data/vehicles";

const dims: VehicleDims = { heightFt: 13.5, lengthFt: 70, widthIn: 102, grossWeightLbs: 79400, axles: 5, trailerType: "53-foot dry van", hazmat: "Flammable" };
const row = { id: "unit-1", label: "Tractor", unit_number: "4471", equipment_type: "eighteen:dryVan", height_inches: 162, length_inches: 840, width_inches: 102, gross_weight_lb: 79400, axles: 5, hazmat: true, hazmat_class: "Flammable", trailer_type: "53-foot dry van", dimensions_confirmed: true };

describe("shared vehicle profile", () => {
  it("preserves the saved hazmat class rather than resetting to None", () => {
    expect(rowToProfile(row).hazmat).toBe("Flammable");
  });
  it("preserves explicit trailer type and measured routing dimensions", () => {
    expect(routingPayload(rowToProfile(row))).toMatchObject(dims);
  });
  it("does not substitute catalog dimensions for missing measurements", () => {
    const legacy = rowToProfile({ id: "legacy", label: null, unit_number: null, equipment_type: null });
    expect(legacy.heightFt).toBe(0);
    expect(legacy.grossWeightLbs).toBe(0);
    expect(() => requireRoutingProfile(legacy)).toThrow("Confirm your actual vehicle");
  });
  it("does not treat a legacy hazmat boolean as a confirmed class", () => {
    const legacy = rowToProfile({ ...row, hazmat_class: null });
    expect(legacy.dimensionsConfirmed).toBe(false);
    expect(() => requireRoutingProfile(legacy)).toThrow();
  });
  it("requires complete measured dimensions, not blank or NaN values", () => {
    expect(validateVehicleDims(dims)).toBeNull();
    expect(validateVehicleDims({ ...dims, heightFt: 0 })).not.toBeNull();
    expect(validateVehicleDims({ ...dims, lengthFt: Number.NaN })).not.toBeNull();
    expect(validateVehicleDims({ ...dims, widthIn: 0 })).not.toBeNull();
  });
  it("rejects negative or fractional weight and axles", () => {
    for (const grossWeightLbs of [-1, 79400.5, Number.NaN]) expect(validateVehicleDims({ ...dims, grossWeightLbs })).not.toBeNull();
    for (const axles of [-1, 5.5, Number.NaN]) expect(validateVehicleDims({ ...dims, axles })).not.toBeNull();
  });
  it("requires explicit trailer and hazmat choices", () => {
    expect(validateVehicleDims({ ...dims, trailerType: " " })).not.toBeNull();
    expect(validateVehicleDims({ ...dims, hazmat: "" as VehicleDims["hazmat"] })).not.toBeNull();
  });
});