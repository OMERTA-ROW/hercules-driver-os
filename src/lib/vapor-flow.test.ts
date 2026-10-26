import { describe, expect, it } from "vitest";
import { createVaporField, vaporDynamics } from "./vapor-flow";
describe("organic vapor", () => {
  it("evolves cloud density at fixed positions without rotating coordinates", () => {
    const field = createVaporField();
    const before = [-0.7, -0.2, 0.3, 0.7].map(x => field(x, 0.2, 4));
    const after = [-0.7, -0.2, 0.3, 0.7].map(x => field(x, 0.2, 8));
    expect(after.some((v, i) => Math.abs(v - (before[i] ?? 0)) > 0.1)).toBe(true);
  });
  it("has faster/brighter speaking flow even with no amplitude", () => {
    expect(vaporDynamics("speaking", 0).speed).toBeGreaterThan(vaporDynamics("idle", 0).speed);
    expect(vaporDynamics("speaking", 0).light).toBeGreaterThan(1);
  });
  it("increases speaking flow with measured amplitude and handles unavailable data", () => {
    expect(vaporDynamics("speaking", 1).speed).toBeGreaterThan(vaporDynamics("speaking", 0).speed);
    expect(vaporDynamics("speaking", NaN)).toEqual(vaporDynamics("speaking", 0));
    expect(vaporDynamics("idle", 1)).toEqual(vaporDynamics("idle", 0));
  });
});