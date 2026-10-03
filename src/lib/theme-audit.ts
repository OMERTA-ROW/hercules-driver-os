/**
 * THEME AUDIT — the maths behind the automated visual regression tests.
 *
 * These helpers read the real design-system stylesheet and the real component
 * source, so the tests fail whenever a colorway loses its bubble tokens, a glow
 * stops complementing its base, a text pair falls under contrast, or a control
 * regains square corners. No screenshots, no snapshots to bless: the checks are
 * computed from the same tokens the browser uses.
 */

export type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number; alpha: number };

/* ------------------------------------------------------------------ COLOR MATH */

export function parseOklch(value: string): Oklch | null {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/i.exec(value);
  if (!m) return null;
  return {
    l: Number(m[1]),
    c: Number(m[2]),
    h: Number(m[3]),
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  };
}

/** oklch -> linear sRGB (unclamped channels are clamped to the gamut). */
function oklchToLinear({ l: L, c: C, h: H }: Oklch): Rgb {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return {
    r: clamp(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: clamp(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: clamp(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

export function relativeLuminance(color: Oklch): number {
  const { r, g, b } = oklchToLinear(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque tokens. */
export function contrastRatio(fg: Oklch, bg: Oklch): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** `color-mix(in oklab, base <pct>%, other)` for two oklch tokens. */
export function mixOklch(base: Oklch, pct: number, other: Oklch): Oklch {
  const w = pct / 100;
  const toAb = ({ l, c, h }: Oklch) => {
    const hr = (h * Math.PI) / 180;
    return { l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
  };
  const A = toAb(base);
  const B = toAb(other);
  const l = A.l * w + B.l * (1 - w);
  const a = A.a * w + B.a * (1 - w);
  const b = A.b * w + B.b * (1 - w);
  return {
    l,
    c: Math.hypot(a, b),
    h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
    alpha: 1,
  };
}

/* --------------------------------------------------------------- CSS PARSING */

export type Block = { selector: string; vars: Record<string, string> };

function declarations(body: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const decl of body.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const name = decl.slice(0, i).trim();
    if (!name.startsWith("--")) continue;
    vars[name] = decl.slice(i + 1).trim();
  }
  return vars;
}

/**
 * Every rule that declares custom properties, in source order. Brace-aware so
 * at-rules (`@theme`, `@media`, `@supports`) and nested rules stay separate.
 */
export function parseBlocks(css: string): Block[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks: Block[] = [];
  let selector = "";
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i]!;
    if (ch === "{") {
      let depth = 1;
      let j = i + 1;
      for (; j < clean.length && depth > 0; j++) {
        if (clean[j] === "{") depth++;
        else if (clean[j] === "}") depth--;
      }
      const body = clean.slice(i + 1, j - 1);
      const sel = selector.trim().replace(/\s+/g, " ");
      if (sel.startsWith("@")) {
        // Recurse so nested rules inside at-rules are still visible.
        blocks.push(...parseBlocks(body));
      } else {
        const vars = declarations(body.replace(/\{[\s\S]*?\}/g, ""));
        if (Object.keys(vars).length) blocks.push({ selector: sel, vars });
        if (body.includes("{")) blocks.push(...parseBlocks(body));
      }
      selector = "";
      i = j;
      continue;
    }
    if (ch === "}") {
      selector = "";
      i++;
      continue;
    }
    if (ch === ";" && !selector.includes("{")) {
      selector = "";
      i++;
      continue;
    }
    selector += ch;
    i++;
  }
  return blocks;
}

function varsFor(blocks: Block[], test: (selector: string) => boolean) {
  const out: Record<string, string> = {};
  for (const b of blocks) {
    if (b.selector.split(",").some((s) => test(s.trim()))) Object.assign(out, b.vars);
  }
  return out;
}

export const colorwayIds = ["white", "grey", "black"] as const;
export type ColorwayId = (typeof colorwayIds)[number];
export const exposures = ["flat"] as const;
export type Exposure = (typeof exposures)[number];

/** Exposure lightens each colorway; the percentages live in the stylesheet. */
function exposureMix(blocks: Block[], exposure: Exposure) {
  if (exposure === "flat") return {};
  const vars = varsFor(blocks, (s) => s === `[data-colorway][data-theme="${exposure}"]`);
  const out: Record<string, number> = {};
  for (const [name, value] of Object.entries(vars)) {
    const pct = /([\d.]+)%/.exec(value);
    if (pct) out[name] = Number(pct[1]);
  }
  return out;
}

/**
 * The tokens actually in effect for one colorway at one exposure — base
 * `:root` values, the colorway override, the matte surface mapping, and the
 * exposure `color-mix`, resolved in the same order the cascade applies them.
 */
export function resolveTokens(
  css: string,
  colorway: ColorwayId,
  exposure: Exposure = "flat",
): Record<string, Oklch> {
  const blocks = parseBlocks(css);
  const raw: Record<string, string> = {
    ...varsFor(blocks, (s) => s === ":root"),
    ...varsFor(blocks, (s) => s === `[data-colorway="${colorway}"]`),
  };
  const resolved: Record<string, Oklch> = {};
  const resolving = new Set<string>();
  const resolve = (name: string): Oklch | null => {
    if (resolved[name]) return resolved[name];
    if (resolving.has(name)) return null;
    const value = raw[name];
    if (!value) return null;
    resolving.add(name);
    const direct = parseOklch(value);
    const ref = /^var\((--[^)]+)\)$/.exec(value)?.[1];
    const color = direct ?? (ref ? resolve(ref) : null);
    resolving.delete(name);
    if (color) resolved[name] = color;
    return color;
  };
  for (const name of Object.keys(raw)) resolve(name);

  const light = resolved["--exposure-light"] ?? { l: 1, c: 0, h: 0, alpha: 1 };
  for (const [name, pct] of Object.entries(exposureMix(blocks, exposure))) {
    const base = resolved[name];
    if (base) resolved[name] = mixOklch(base, pct, light);
  }
  return resolved;
}

/* ------------------------------------------------- ROUND CONTROL GEOMETRY SCAN */

const SQUARE_RADIUS = /rounded-(none|sm|md|lg|xl|2xl|3xl)\b/;
const INTERACTIVE = /(type="button"|role="switch"|role="radio"|aria-pressed|onClick=)/;

/**
 * Interactive JSX tags that still carry a fixed non-round radius class.
 * Bubbles are full-radius, so a hit here is a styling regression.
 */
export function findSquareControls(files: { path: string; source: string }[]) {
  const hits: { path: string; line: number; radius: string }[] = [];
  for (const { path, source } of files) {
    const re = /<[A-Za-z][A-Za-z0-9.]*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      let i = m.index + m[0].length;
      let depth = 0;
      for (; i < source.length; i++) {
        const ch = source[i];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        else if (ch === ">" && depth === 0) break;
      }
      const tag = source.slice(m.index, i + 1);
      if (!INTERACTIVE.test(tag)) continue;
      const radius = SQUARE_RADIUS.exec(tag);
      if (radius) {
        hits.push({
          path,
          line: source.slice(0, m.index).split("\n").length,
          radius: radius[0],
        });
      }
    }
  }
  return hits;
}
