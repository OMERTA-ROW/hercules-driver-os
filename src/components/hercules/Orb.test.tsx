import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ motionActive: true }));
vi.mock("@/lib/theme", () => ({ useTheme: () => state }));
vi.mock("@/lib/voice", () => ({ useVoice: () => ({}) }));
vi.mock("@/lib/voice-level", () => ({ getVoiceLevel: () => 0.5 }));
import { Orb } from "./Orb";

describe("Hercules orb presentation", () => {
  it("uses playback state rather than pending command mode for its accessible status", () => {
    const stop = vi.fn();
    const { rerender } = render(<Orb mode="speaking" visualState="thinking" colorway="shapher" onActivate={stop} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Hercules is preparing a response");
    rerender(<Orb mode="speaking" visualState="speaking" colorway="shapher" onActivate={stop} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Hercules is speaking");
    fireEvent.click(screen.getByRole("button", { name: "Stop Hercules voice" }));
    expect(stop).toHaveBeenCalledTimes(1);
    rerender(<Orb mode="idle" visualState="idle" colorway="shapher" onActivate={stop} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Hercules royal vapor orb, idle");
  });
  it("keeps truthful speaking status when motion is disabled", () => {
    state.motionActive = false;
    render(<Orb mode="speaking" visualState="speaking" colorway="shapher" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Hercules is speaking");
    state.motionActive = true;
  });
});