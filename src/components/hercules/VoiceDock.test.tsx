import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const api: Record<string, unknown> = {};
vi.mock("@/lib/voice", () => ({ useVoice: () => api }));
vi.mock("@/lib/bol", () => ({ useBol: () => ({ busy: false, draft: null, handleCommand: vi.fn() }) }));
vi.mock("./Orb", () => ({ Orb: () => <div data-testid="orb" /> }));

import { VoiceDock } from "./VoiceDock";

function setup(over: Record<string, unknown> = {}) {
  Object.assign(api, {
    mode: "idle",
    orbState: "idle",
    turns: [],
    colorway: "x",
    listen: vi.fn(),
    stop: vi.fn(),
    say: vi.fn(),
    approve: vi.fn(),
    decline: vi.fn(),
    clear: vi.fn(),
    voice: { name: "Atlas" },
    lastLine: "",
    speechSource: null,
    speechNote: "",
    canRetrySpeech: false,
    retrySpeech: vi.fn(),
    ...over,
  });
  render(<VoiceDock />);
  fireEvent.click(screen.getByRole("button", { name: "Open Hercules conversation" }));
}

describe("VoiceDock conversation", () => {
  beforeEach(() => {
    for (const k of Object.keys(api)) delete api[k];
  });

  it("sends typed text through the shared voice session", async () => {
    setup();
    const box = screen.getByLabelText("Message Hercules");
    fireEvent.change(box, { target: { value: "  how many hours left  " } });
    fireEvent.submit(box.closest("form")!);
    await vi.waitFor(() => expect(api["say"]).toHaveBeenCalledWith("how many hours left"));
  });

  it("shows typed and spoken turns in one transcript", () => {
    setup({
      turns: [
        { id: "1", from: "driver", text: "typed question" },
        { id: "2", from: "hercules", text: "spoken answer" },
      ],
    });
    expect(screen.getByText("typed question")).toBeTruthy();
    expect(screen.getByText("spoken answer")).toBeTruthy();
  });

  it("offers Stop while speaking and calls stop", () => {
    setup({ mode: "speaking", orbState: "speaking" });
    fireEvent.click(screen.getByRole("button", { name: "Stop speaking" }));
    expect(api["stop"]).toHaveBeenCalled();
  });

  it("offers Cancel while thinking", () => {
    setup({ mode: "speaking", orbState: "thinking" });
    expect(screen.getByRole("button", { name: "Cancel reply" })).toBeTruthy();
  });

  it("shows no Stop control when idle", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Stop speaking" })).toBeNull();
  });

  it("reports voice errors truthfully", () => {
    setup({ speechSource: "unavailable", speechNote: "Voice service not configured" });
    expect(screen.getAllByText(/Voice unavailable/).length).toBeGreaterThan(0);
  });

  it("Escape minimizes the panel", () => {
    setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("Message Hercules")).toBeNull();
  });
});
