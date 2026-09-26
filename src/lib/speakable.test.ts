import { describe, expect, it } from "vitest";
import { speakable } from "@/lib/speakable";

describe("speakable keeps meaning", () => {
  it("strips markdown but not the words", () => {
    expect(speakable("## Fuel\n- **Pilot** in 12 miles\n- [Map](https://x.y)")).toBe(
      "Fuel. Pilot in 12 miles. Map",
    );
  });
  it("keeps negatives, decimals and dollar amounts", () => {
    expect(speakable("Net is -$42.50 today, rate $2.35 a mile, temp -4.5 degrees")).toBe(
      "Net is -$42.50 today, rate $2.35 a mile, temp -4.5 degrees",
    );
  });
  it("reads comparisons as words", () => {
    expect(speakable("Clearance > 13.6 ft, weight <= 80,000 lb, grade >= 6%")).toBe(
      "Clearance over 13.6 ft, weight at most 80,000 lb, grade at least 6%",
    );
    expect(speakable("Keep it < 65")).toBe("Keep it under 65");
  });
  it("keeps part and load IDs", () => {
    expect(speakable("Order part #A-1234 and PN_88-2, filter 1R-0750")).toBe(
      "Order part number A-1234 and PN_88-2, filter 1R-0750",
    );
  });
  it("does not eat a leading decimal or numbered value", () => {
    expect(speakable("3.5 hours left")).toBe("3.5 hours left");
    expect(speakable("1. Pull over\n2. Call it in")).toBe("Pull over. Call it in");
  });
});
