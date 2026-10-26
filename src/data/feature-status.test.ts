import { describe, expect, it } from "vitest";
import { featureStatuses } from "./feature-status";

describe("audited add-on availability", () => {
  it("records all ten requested add-ons once", () => {
    expect(featureStatuses.map((item) => item.id).sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
  it("does not expose offline, driver network or fee ledger as implemented screens", () => {
    for (const id of [4, 9, 10]) {
      const item = featureStatuses.find((feature) => feature.id === id);
      expect(item?.status).toBe("Planned");
      expect(item?.destination).toBeUndefined();
    }
  });
  it("keeps unconnected truck routing and hazards in Demo", () => {
    for (const id of [1, 3, 5, 7]) expect(featureStatuses.find((item) => item.id === id)?.status).toBe("Demo");
  });
  it("does not equate profile or voice groundwork with full completion", () => {
    for (const id of [2, 6, 8]) expect(featureStatuses.find((item) => item.id === id)?.status).toBe("Partial");
  });
});