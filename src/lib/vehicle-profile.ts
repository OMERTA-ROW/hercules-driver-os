import { specFor, type EighteenSub, type VehicleKind, type VehicleProfile } from "@/data/vehicles";

export type VehicleDims = {
  heightFt: number;
  lengthFt: number;
  widthIn: number;
  grossWeightLbs: number;
  axles: number;
  trailerType: string;
  hazmat: VehicleProfile["hazmat"];
};

export function validateVehicleDims(d: VehicleDims): string | null {
  if (!Number.isFinite(d.heightFt) || d.heightFt < 3 || d.heightFt > 20) return "Height should be between 3 and 20 feet.";
  if (!Number.isFinite(d.lengthFt) || d.lengthFt < 6 || d.lengthFt > 120) return "Length should be between 6 and 120 feet.";
  if (!Number.isFinite(d.widthIn) || d.widthIn < 48 || d.widthIn > 240) return "Width should be between 48 and 240 inches.";
  if (!Number.isInteger(d.grossWeightLbs) || d.grossWeightLbs < 1000 || d.grossWeightLbs > 250000) return "Weight should be a whole number between 1,000 and 250,000 pounds.";
  if (!Number.isInteger(d.axles) || d.axles < 2 || d.axles > 13) return "Axles should be a whole number between 2 and 13.";
  if (!d.trailerType.trim() || d.trailerType.trim().length > 80) return "Enter the trailer type, or No trailer (up to 80 characters).";
  if (!["None", "Flammable", "Corrosive", "Explosive"].includes(d.hazmat)) return "Confirm the hazardous goods class, including None when applicable.";
  return null;
}

export type VehicleRow = {
  id: string;
  label: string | null;
  unit_number: string | null;
  equipment_type: string | null;
  height_inches?: number | null;
  length_inches?: number | null;
  width_inches?: number | null;
  gross_weight_lb?: number | null;
  axles?: number | null;
  hazmat?: boolean;
  hazmat_class?: string | null;
  trailer_type?: string | null;
  dimensions_confirmed?: boolean;
};

export function rowToProfile(row: VehicleRow): VehicleProfile {
  const [kind, sub] = (row.equipment_type ?? "eighteen:dryVan").split(":");
  const spec = specFor((kind || "eighteen") as VehicleKind, sub as EighteenSub | undefined);
  const hazmat = ["None", "Flammable", "Corrosive", "Explosive"].includes(row.hazmat_class ?? "")
    ? row.hazmat_class as VehicleProfile["hazmat"] : "None";
  const profile: VehicleProfile = {
    ...spec,
    // Unknown numbers are explicit zeroes, not a catalog vehicle masquerading as measured equipment.
    heightFt: (row.height_inches ?? 0) / 12,
    lengthFt: (row.length_inches ?? 0) / 12,
    widthIn: row.width_inches ?? 0,
    grossWeightLbs: row.gross_weight_lb ?? 0,
    axles: row.axles ?? 0,
    minClearanceFt: (row.height_inches ?? 0) / 12 + 1,
    id: row.id,
    unit: row.unit_number?.trim() || row.label?.trim() || spec.label,
    hazmat,
    trailerType: row.trailer_type ?? "Unknown",
    dimensionsConfirmed: row.dimensions_confirmed === true && row.hazmat_class != null,
  };
  return profile;
}

export function requireRoutingProfile(profile: VehicleProfile): void {
  if (!profile.dimensionsConfirmed) throw new Error("Confirm your actual vehicle dimensions, trailer and hazmat in Equipment before truck routing.");
  const error = validateVehicleDims({ ...profile, trailerType: profile.trailerType ?? "" });
  if (error) throw new Error(error);
}