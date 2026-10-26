export type VaporState = "idle" | "listening" | "thinking" | "speaking";

/** Baseline speaking motion survives a missing/zero analyser; it never implies playback. */
export function vaporDynamics(state: VaporState, amplitude: number) {
  const level = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0;
  switch (state) {
    case "speaking": return { speed: 0.32 + level * 0.4, light: 1.2 + level * 0.45 };
    case "listening": return { speed: 0.1 + level * 0.08, light: 1.04 + level * 0.12 };
    case "thinking": return { speed: 0.17, light: 1.1 };
    default: return { speed: 0.065, light: 1 };
  }
}

/** Deterministic noise field: independent layers are advected and domain-warped, not rotated. */
export function createVaporField() {
  let seed = 712367;
  const field = Float32Array.from({ length: 4096 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const at = (a: number, b: number) => field[(a & 63) + (b & 63) * 64] ?? 0;
    const top = at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx;
    const bottom = at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
  // Meandering, incommensurate drift: currents wander instead of following a circular track or fixed loop.
  const drift = (t: number, a: number, b: number) => Math.sin(t * a) * 1.7 + Math.sin(t * b + 1.3) * 1.1 + t * 0.05;
  return (x: number, y: number, time: number) => {
    const dx1 = drift(time, 0.11, 0.173), dy1 = drift(time + 7, 0.089, 0.141);
    const dx2 = drift(time + 3, 0.067, 0.193), dy2 = drift(time + 11, 0.131, 0.057);
    const warpX = noise(x * 2 + dx1, y * 2 - dy2) * 1.6;
    const warpY = noise(x * 2 - dx2 + 19, y * 2 + dy1) * 1.6;
    const current = noise(x * 1.3 + warpY * 0.5 + dy2 * 0.4, y * 1.3 - warpX * 0.5 + 41) * 0.9;
    const large = noise(x * 3 + warpX + current + dx1 * 0.6, y * 3 + warpY - dy1 * 0.8);
    const wisps = noise(x * 7 - warpY + current - dx2, y * 7 + warpX + dy2 * 0.7);
    const fine = noise(x * 15 + warpX + dy1 * 0.9, y * 15 - warpY - dx1 * 0.5);
    return Math.max(0, Math.min(1, (large * 0.58 + wisps * 0.3 + fine * 0.12 - 0.35) * 2.25));
  };
}
