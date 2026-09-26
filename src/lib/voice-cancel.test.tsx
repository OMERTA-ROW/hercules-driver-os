import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A provider reply that arrives late must never be heard.
 *
 * Covers the two real failure modes: pressing Stop (or previewing another
 * persona) while the paid request is still in flight, and a failure while a
 * premium clip is sounding. Device speech synthesis must never be used.
 */

type Deferred = {
  resolve: (v: unknown) => void;
  promise: Promise<unknown>;
};

const pending: Deferred[] = [];

vi.mock("@/lib/speech.functions", () => ({
  speakLine: vi.fn(() => {
    let resolve: (v: unknown) => void = () => {};
    const promise = new Promise<unknown>((r) => {
      resolve = r;
    });
    pending.push({ resolve, promise });
    return promise;
  }),
}));

/* Premium speech is only attempted for a signed-in account, so the fixture
   provides a session. Without one the code correctly skips the paid call. */
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: "rb-voice" } } }, error: null }),
    },
  },
}));

const played: string[] = [];
const paused: string[] = [];
const spoken: string[] = [];
const clipUrls: string[] = [];
let synthCancels = 0;

class AudioStub {
  src: string;
  crossOrigin: string | null = null;
  onended: (() => void) | null = null;
  constructor(src?: string) {
    this.src = src ?? "";
    if (this.src.includes("/voice-samples/")) clipUrls.push(this.src);
  }
  play() {
    // The bundled sample clips are not available in this environment, which is
    // exactly the path that falls through to the live paid request under test.
    if (this.src.includes("/voice-samples/")) return Promise.reject(new Error("no clip"));
    played.push(this.src);
    return Promise.resolve();
  }
  pause() {
    paused.push(this.src);
  }
  addEventListener() {}
  removeEventListener() {}
}

beforeEach(() => {
  pending.length = 0;
  played.length = 0;
  paused.length = 0;
  spoken.length = 0;
  synthCancels = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Audio = AudioStub;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).SpeechSynthesisUtterance = class {
    text: string;
    rate = 1;
    pitch = 1;
    lang = "en-US";
    voice: unknown = null;
    constructor(text: string) {
      this.text = text;
    }
  };
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel: () => {
        synthCancels += 1;
      },
      speak: (u: { text: string }) => spoken.push(u.text),
      getVoices: () => [],
    },
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

describe("stale premium speech is never heard", () => {
  it("drops a provider reply that lands after Stop", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("zeus");
    });
    expect(pending.length).toBe(1);

    await act(async () => {
      h.api.stop();
    });
    // The provider answers only now — after the driver stopped.
    await act(async () => {
      pending[0]!.resolve({ ok: true, audio: "data:audio/mpeg;base64,AAA", charged: 1 });
    });

    expect(played).toEqual([]);
    expect(spoken).toEqual([]);
    h.unmount();
  });

  it("drops the older reply when a newer voice is previewed", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("zeus");
    });
    await act(async () => {
      void h.api.preview("hera");
    });
    expect(pending.length).toBe(2);

    // Out-of-order: the first request answers last and must be discarded.
    await act(async () => {
      pending[1]!.resolve({ ok: true, audio: "new-line", charged: 1 });
    });
    await act(async () => {
      pending[0]!.resolve({ ok: true, audio: "old-line", charged: 1 });
    });

    expect(played).toEqual(["new-line"]);
    h.unmount();
  });

  it("never uses device speech synthesis after Stop", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("zeus");
    });
    await act(async () => {
      h.api.stop();
    });
    await act(async () => {
      pending[0]!.resolve({ ok: false, reason: "no_credits", message: "no credits" });
    });

    expect(spoken).toEqual([]);
    expect(h.api.speechSource).toBe(null);
    h.unmount();
  });

  it("stops the premium clip and shows text — no robotic device voice", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("zeus");
    });
    await act(async () => {
      pending[0]!.resolve({ ok: true, audio: "paid-clip", charged: 1 });
    });
    expect(played).toEqual(["paid-clip"]);
    expect(h.api.speechSource).toBe("premium");

    await act(async () => {
      void h.api.preview("hera");
    });
    await act(async () => {
      pending[1]!.resolve({ ok: false, reason: "no_credits", message: "no credits" });
    });

    expect(paused).toContain("paid-clip");
    expect(spoken).toEqual([]);
    expect(synthCancels).toBe(0);
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.speechNote).toMatch(/screen/i);
    expect(h.api.speechNote).not.toMatch(/device spoke/i);
    // A plan/credit decision is not a temporary fault: no Retry offered.
    expect(h.api.canRetrySpeech).toBe(false);
    h.unmount();
  });

  it("offers one Retry after a provider failure and plays the line on retry", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("athena");
    });
    await act(async () => {
      pending[0]!.resolve({ ok: false, reason: "provider", message: "The voice service didn't answer." });
    });
    expect(spoken).toEqual([]);
    expect(h.api.canRetrySpeech).toBe(true);
    expect(pending.length).toBe(1); // nothing retried automatically

    await act(async () => {
      h.api.retrySpeech();
    });
    expect(pending.length).toBe(2);
    expect(h.api.canRetrySpeech).toBe(false);
    await act(async () => {
      pending[1]!.resolve({ ok: true, audio: "retry-clip", charged: 1 });
    });
    expect(played).toEqual(["retry-clip"]);
    expect(h.api.speechSource).toBe("premium");
    h.unmount();
  });

  it("cleans up and shows text when the request itself throws", async () => {
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("ares");
    });
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pending[0] as any).resolve(Promise.reject(new Error("offline")));
    });
    expect(spoken).toEqual([]);
    expect(played).toEqual([]);
    expect(h.api.speechSource).toBe("unavailable");
    expect(h.api.canRetrySpeech).toBe(true);
    h.unmount();
  });

  it("requests preview clips with the current voice-settings version", async () => {
    const { VOICE_SETTINGS_VERSION } = await import("@/data/voices");
    const h = await mountVoice();
    await act(async () => {
      void h.api.preview("hercules");
    });
    expect(clipUrls.some((u) => u.endsWith(`/voice-samples/hercules.mp3?v=${VOICE_SETTINGS_VERSION}`))).toBe(true);
    h.unmount();
  });
});
