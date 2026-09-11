/**
 * VOICE LEVEL
 * ===========
 * How loud the voice is right now, 0 to 1. Kept outside React on purpose: the
 * orb reads it every frame to size its ripples, and re-rendering the whole app
 * sixty times a second to carry a number would be wasteful.
 *
 * While HERCULES speaks, the value comes off the real audio through an
 * analyser, so an emphatic line drives the surface harder than a quiet one.
 * While the driver speaks it runs off a wandering envelope until a live
 * microphone stream is wired in — same shape, same behaviour.
 */

let value = 0;

export function getVoiceLevel() {
  return value;
}

export function setVoiceLevel(v: number) {
  value = v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Meter a playing audio element. Returns a teardown. */
export function attachAudioLevel(el: HTMLAudioElement): () => void {
  const Ctor =
    typeof window !== "undefined"
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctor) return () => setVoiceLevel(0);

  let raf = 0;
  let ctx: AudioContext | null = null;
  try {
    ctx = new Ctor();
    void ctx.resume().catch(() => {});
    const src = ctx.createMediaElementSource(el);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);

    const data = new Uint8Array(analyser.fftSize);
    let smooth = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const d = (data[i]! - 128) / 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / data.length);
      /* Speech rarely peaks the meter — lift it so normal talking moves the
         liquid, and let a shouted line push it near the top. */
      const lvl = Math.min(1, rms * 3.4);
      smooth = smooth * 0.72 + lvl * 0.28;
      setVoiceLevel(smooth);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  } catch {
    return () => setVoiceLevel(0);
  }

  return () => {
    cancelAnimationFrame(raf);
    setVoiceLevel(0);
    void ctx?.close().catch(() => {});
  };
}

/** Stand-in envelope for whichever side has no audio stream yet. */
export function startSynthLevel(strength = 0.55): () => void {
  let smooth = 0;
  const t = setInterval(() => {
    const target = Math.random() ** 1.6 * strength * 1.5;
    smooth = smooth * 0.6 + target * 0.4;
    setVoiceLevel(smooth);
  }, 90);
  return () => {
    clearInterval(t);
    setVoiceLevel(0);
  };
}
