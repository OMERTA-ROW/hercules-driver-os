import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Speech lifecycle races. Live (paid) lines come from real HERCULES replies
 * (`announce`); previews only ever play the free static clip. Device speech
 * synthesis must never be used.
 */

type Deferred = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
const pending: Deferred[] = [];
const speakLine = vi.fn(
  () =>
    new Promise<unknown>((resolve, reject) => {
      pending.push({ resolve, reject });
    }),
);
vi.mock("@/lib/speech.functions", () => ({ speakLine: (...a: unknown[]) => speakLine(...(a as [])) }));

let session: () => Promise<unknown> = () =>
  Promise.resolve({ data: { session: { user: { id: "rb-voice" } } }, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => session() } },
}));

const played: string[] = [];
const paused: string[] = [];
const spoken: string[] = [];
const clipUrls: string[] = [];
const instances: AudioStub[] = [];
/** How static sample clips behave in this test. */
let sampleMode: "reject" | "resolve" | "pending" = "reject";
const samplePlays: Array<() => void> = [];

class AudioStub {
  src: string;
  crossOrigin: string | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = true;
  constructor(src?: string) {
    this.src = src ?? "";
    instances.push(this);
    if (this.src.includes("/voice-samples/")) clipUrls.push(this.src);
  }
  play() {
    if (this.src.includes("/voice-samples/")) {
      if (sampleMode === "reject") return Promise.reject(new Error("no clip"));
      if (sampleMode === "pending")
        return new Promise<void>((r) =>
          samplePlays.push(() => {
            this.paused = false;
            r();
          }),
        );
    }
    this.paused = false;
    played.push(this.src);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    paused.push(this.src);
  }
  addEventListener() {}
  removeEventListener() {}
}

beforeEach(() => {
  vi.useRealTimers();
  pending.length = 0;
  played.length = 0;
  paused.length = 0;
  spoken.length = 0;
  clipUrls.length = 0;
  instances.length = 0;
  samplePlays.length = 0;
  sampleMode = "reject";
  speakLine.mockClear();
  session = () => Promise.resolve({ data: { session: { user: { id: "rb-voice" } } }, error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Audio = AudioStub;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: () => {}, speak: (u: { text: string }) => spoken.push(u.text), getVoices: () => [] },
  });
});

async function mountVoice() {
  const { VoiceProvider, useVoice } = await import("@/lib/voice");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api: any = null;
  function Probe() {
    api = useVoice();
    return null;
  }
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <VoiceProvider>
        <Probe />
      </VoiceProvider>,
    );
  });
  return {
    get api() {
      return api;
    },
    unmount: () => act(() => root.unmount()),
  };
}

const flush = () => act(async () => {});
const live = (audio: string) => ({ ok: true, audio, charged: 1 });
const liveEl = (src: string) => instances.find((a) => a.src === src)!;

describe("live reply lifecycle", () => {
  it("drops a provider reply that lands after Stop", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("Fuel stop in ten miles."));
    await flush();
    expect(pending.length).toBe(1);
    await act(async () => h.api.stop());
    await act(async () => pending[0]!.resolve(live("late")));
    expect(played).toEqual([]);
    expect(spoken).toEqual([]);
    h.unmount();
  });

  it("keeps speaking for the real audio lifetime, past the read-time timer", async () => {
    vi.useFakeTimers();
    const h = await mountVoice();
    await act(async () => h.api.announce("Short."));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => pending[0]!.resolve(live("long-line")));
    expect(h.api.mode).toBe("speaking");
    // The fixed read-time estimate (~2s) passes; the real audio is still playing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(h.api.mode).toBe("speaking");
    await act(async () => liveEl("long-line").onended?.());
    expect(h.api.mode).toBe("idle");
    h.unmount();
  });

  it("returns to idle and releases the audio on a playback error", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("Scale ahead."));
    await flush();
    await act(async () => pending[0]!.resolve(live("err-line")));
    const el = liveEl("err-line");
    await act(async () => el.onerror?.());
    expect(h.api.mode).toBe("idle");
    expect(el.src).toBe("");
    h.unmount();
  });

  it("a newer line supersedes an older one answered out of order", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("First."));
    await flush();
    await act(async () => h.api.announce("Second."));
    await flush();
    expect(pending.length).toBe(2);
    await act(async () => pending[1]!.resolve(live("new-line")));
    await act(async () => pending[0]!.resolve(live("old-line")));
    expect(played).toEqual(["new-line"]);
    h.unmount();
  });

  it("plan/credit refusals show text, no Retry, no device voice", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("Hours check."));
    await flush();
    await act(async () => pending[0]!.resolve({ ok: false, reason: "no_credits", message: "no credits" }));
    expect(spoken).toEqual([]);
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.speechNote).toMatch(/screen/i);
    expect(h.api.canRetrySpeech).toBe(false);
    expect(h.api.mode).toBe("idle");
    h.unmount();
  });

  it("Retry shows speaking for the actual retried audio, then idle on end", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("Weigh station open."));
    await flush();
    await act(async () => pending[0]!.resolve({ ok: false, reason: "provider", message: "x" }));
    expect(h.api.canRetrySpeech).toBe(true);
    expect(pending.length).toBe(1); // nothing retried automatically
    await act(async () => h.api.retrySpeech());
    await flush();
    expect(pending.length).toBe(2);
    await act(async () => pending[1]!.resolve(live("retry-clip")));
    expect(played).toEqual(["retry-clip"]);
    expect(h.api.mode).toBe("speaking");
    await act(async () => liveEl("retry-clip").onended?.());
    expect(h.api.mode).toBe("idle");
    h.unmount();
  });

  it("handles a rejected or erroring getSession without unhandled failures", async () => {
    session = () => Promise.reject(new Error("storage locked"));
    const h = await mountVoice();
    await act(async () => h.api.announce("Rest area."));
    await flush();
    expect(speakLine).not.toHaveBeenCalled();
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.canRetrySpeech).toBe(true);

    session = () => Promise.resolve({ data: { session: null }, error: new Error("refresh failed") });
    await act(async () => h.api.retrySpeech());
    await flush();
    expect(speakLine).not.toHaveBeenCalled();
    expect(h.api.speechSource).toBe("unavailable");
    h.unmount();
  });

  it("a thrown request cleans up and offers Retry", async () => {
    const h = await mountVoice();
    await act(async () => h.api.announce("Detour."));
    await flush();
    await act(async () => pending[0]!.reject(new Error("offline")));
    expect(played).toEqual([]);
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.canRetrySpeech).toBe(true);
    h.unmount();
  });

  it.each(["stop", "clear", "voice", "line"] as const)(
    "%s clears a stale Retry and invalidates old audio",
    async (how) => {
      const h = await mountVoice();
      await act(async () => h.api.announce("One."));
      await flush();
      await act(async () => pending[0]!.resolve({ ok: false, reason: "provider", message: "x" }));
      expect(h.api.canRetrySpeech).toBe(true);
      await act(async () => h.api.announce("Two."));
      await flush();
      // "Two." is in flight; now the driver acts.
      await act(async () => {
        if (how === "stop") h.api.stop();
        if (how === "clear") h.api.clear();
        if (how === "voice") h.api.setVoice(h.api.voiceId === "zeus" ? "hera" : "zeus");
        if (how === "line") h.api.announce("Three.");
      });
      await flush();
      await act(async () => pending[1]!.resolve(live("stale-two")));
      expect(played).not.toContain("stale-two");
      if (how !== "line") {
        expect(h.api.canRetrySpeech).toBe(false);
        expect(h.api.speechSource).toBe(null);
      }
      h.unmount();
    },
  );
});

describe("free static previews", () => {
  it("never falls through to paid speech when the clip is missing", async () => {
    sampleMode = "reject";
    const h = await mountVoice();
    await act(async () => h.api.preview("zeus"));
    await flush();
    expect(speakLine).not.toHaveBeenCalled();
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.speechNote).toMatch(/no credits/i);
    expect(h.api.canRetrySpeech).toBe(true);
    expect(h.api.previewing).toBe(null);

    // Retry retries the static clip only.
    sampleMode = "resolve";
    await act(async () => h.api.retrySpeech());
    await flush();
    expect(speakLine).not.toHaveBeenCalled();
    expect(h.api.speechSource).toBe("sample");
    h.unmount();
  });

  it("Stop during a pending clip play() cancels it and a late success can't resurrect it", async () => {
    sampleMode = "pending";
    const h = await mountVoice();
    await act(async () => void h.api.preview("athena"));
    const clip = instances.find((a) => a.src.includes("athena"))!;
    await act(async () => h.api.stop());
    expect(clip.src).toBe("");
    await act(async () => samplePlays[0]!());
    await flush();
    expect(clip.paused).toBe(true);
    expect(h.api.speechSource).toBe(null);
    expect(h.api.previewing).toBe(null);
    h.unmount();
  });

  it("a newer preview silences an older clip whose play() lands late", async () => {
    sampleMode = "pending";
    const h = await mountVoice();
    await act(async () => void h.api.preview("zeus"));
    await act(async () => void h.api.preview("hera"));
    const [zeus, hera] = [
      instances.find((a) => a.src.includes("zeus"))!,
      instances.find((a) => a.src.includes("hera"))!,
    ];
    await act(async () => samplePlays[1]!());
    await act(async () => samplePlays[0]!());
    await flush();
    expect(zeus.paused).toBe(true);
    expect(hera.paused).toBe(false);
    expect(h.api.previewing).toBe("hera");
    h.unmount();
  });

  it("a play() that succeeds after the timeout is paused, not heard", async () => {
    vi.useFakeTimers();
    sampleMode = "pending";
    const h = await mountVoice();
    await act(async () => void h.api.preview("ares"));
    const clip = instances.find((a) => a.src.includes("ares"))!;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(h.api.speechSource).toBe("unavailable");
    await act(async () => samplePlays[0]!());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(clip.paused).toBe(true);
    expect(speakLine).not.toHaveBeenCalled();
    h.unmount();
  });

  it("requests preview clips with the current voice-settings version", async () => {
    const { VOICE_SETTINGS_VERSION } = await import("@/data/voices");
    const h = await mountVoice();
    await act(async () => void h.api.preview("hercules"));
    expect(clipUrls.some((u) => u.endsWith(`/voice-samples/hercules.mp3?v=${VOICE_SETTINGS_VERSION}`))).toBe(true);
    h.unmount();
  });
});
