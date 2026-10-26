import { useEffect, useRef } from "react";
import { getVoiceLevel } from "@/lib/voice-level";
import { createVaporField, vaporDynamics, type VaporState } from "@/lib/vapor-flow";

/** Low-resolution volumetric-looking 2D field; no WebGL, providers, or per-frame React updates. */
export function CloudVapor({ state, motion }: { state: VaporState; motion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const redrawRef = useRef<(() => void) | null>(null);
  stateRef.current = state;
  useEffect(() => { redrawRef.current?.(); }, [state]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const compact = canvas.getBoundingClientRect().width < 80;
    const size = compact ? 56 : window.matchMedia("(max-width: 640px)").matches ? 80 : 96;
    canvas.width = size; canvas.height = size;
    const noise = createVaporField();
    const pixels = ctx.createImageData(size, size);
    const styles = getComputedStyle(canvas);
    const palette = document.createElement("canvas").getContext("2d");
    if (!palette) return;
    const color = (token: string) => {
      palette.fillStyle = styles.getPropertyValue(token).trim();
      palette.fillRect(0, 0, 1, 1);
      return palette.getImageData(0, 0, 1, 1).data;
    };
    const purple = color("--vapor-purple"), pearl = color("--vapor-pearl"), violet = color("--vapor-flare");
    let time = 4, frame = 0, last = 0, visible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (dt: number) => {
      const dynamics = vaporDynamics(stateRef.current, getVoiceLevel());
      time += dt * dynamics.speed;
      // Soft, irregular breathing of light (two incommensurate slow waves).
      const breath = 1 + Math.sin(time * 0.9) * 0.025 + Math.sin(time * 0.37 + 2) * 0.02;
      const light = dynamics.light * breath;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const nx = x / size * 2 - 1, ny = y / size * 2 - 1;
        const radius = Math.sqrt(nx * nx + ny * ny);
        const depth = Math.sqrt(Math.max(0, 1 - radius * radius));
        const cloud = noise(nx, ny, time);
        const density = cloud * cloud * (0.35 + depth * 0.65);
        const shade = 0.5 + depth * 0.5;
        const glow = Math.max(0, light - 1) * 0.4;
        const wisp = noise(ny * 1.7 + 5, nx * 1.7 - 3, time * 0.6) * 0.35;
        const i = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) {
          const mix = Math.min(1, glow + wisp);
          const base = (purple[c] ?? 0) * (1 - mix) + (violet[c] ?? 0) * mix;
          pixels.data[i + c] = (base * (1 - density) + (pearl[c] ?? 255) * density) * shade * light;
        }
        pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
    };
    const tick = (now: number) => {
      if (visible && !document.hidden && now - last >= (compact ? 100 : 30)) {
        draw(last ? Math.min((now - last) / 1000, 0.15) : 0); last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    redrawRef.current = () => draw(0);
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      draw(0);
      if (motion && !reduced.matches) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; last = 0; });
    observer.observe(canvas);
    reduced.addEventListener("change", sync); sync();
    return () => { redrawRef.current = null; cancelAnimationFrame(frame); observer.disconnect(); reduced.removeEventListener("change", sync); };
  }, [motion]);
  return <canvas ref={canvasRef} className="vapor-orb-field" aria-hidden />;
}