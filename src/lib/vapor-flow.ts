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
  return (x: number, y: number, time: number) => {
    const warpX = noise(x * 2 + time * 0.23, y * 2 - time * 0.15) * 1.5;
    const warpY = noise(x * 2 - time * 0.18 + 19, y * 2 + time * 0.21) * 1.5;
    const large = noise(x * 3 + warpX + time * 0.12, y * 3 + warpY - time * 0.28);
    const wisps = noise(x * 7 - warpY - time * 0.31, y * 7 + warpX + time * 0.16);
    const fine = noise(x * 15 + warpX + time * 0.2, y * 15 - warpY - time * 0.11);
    return Math.max(0, Math.min(1, (large * 0.58 + wisps * 0.3 + fine * 0.12 - 0.35) * 2.25));
  };
}