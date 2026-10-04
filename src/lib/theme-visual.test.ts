/**
 * VISUAL REGRESSION — Shapher styling and readable contrast across every
 * screen, checked from the real stylesheet and the
 * real component source instead of blessed screenshots.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import {
  colorwayIds,
  contrastRatio,
  exposures,
  findSquareControls,
  resolveTokens,
} from "./theme-audit";

const css = readFileSync("src/styles.css", "utf8");

function tsxFiles(dir: string, out: { path: string; source: string }[] = []) {
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) tsxFiles(path, out);
    else if (path.endsWith(".tsx") && !path.endsWith(".test.tsx"))
      out.push({ path, source: readFileSync(path, "utf8") });
  }
  return out;
}

const screens = [...tsxFiles("src/routes"), ...tsxFiles("src/components/hercules")];

describe("bubble styling", () => {
  it("keeps the shared bubble utilities in the design system", () => {
    for (const util of ["bubble-bar", "bubble-tab", "bubble-card", "matte-control", "matte-map"]) {
      expect(css).toContain(util);
    }
  });

  it("has no interactive control left with square corners on any screen", () => {
    const hits = findSquareControls(screens);
    expect(hits.map((h) => `${h.path}:${h.line} ${h.radius}`)).toEqual([]);
  });

  it("uses the local grain and disables active surface motion when requested", () => {
    expect(css).toContain('url("./assets/shapher-grain.png")');
    expect(css).toContain('[data-surface-motion="off"]');
  });

  it("honours the system reduced-motion setting", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".surface-motion-zone::after { display: none; }");
  });

  it("keeps the decorative liquid orb original, matte, round, and texture-free", () => {
    const orb = css.slice(css.indexOf("/* Original Hercules Liquid Orb"));
    expect(orb).toContain("background: #2d2b29");
    expect(orb).toContain("border-radius: 50%");
    expect(orb).toContain("liquid-orb-surface 30s");
    expect(orb).toContain('.liquid-orb[data-motion="off"]');
    expect(orb).not.toContain("box-shadow");
    expect(orb).not.toContain("gradient(");
    expect(orb).not.toContain("liquid-orb-grain");
  });
});

describe("single Shapher theme", () => {
  const required = [
    "--background",
    "--card",
    "--popover",
    "--foreground",
    "--primary",
    "--border",
    "--ring",
  ];

  it.each(colorwayIds)("%s defines a complete token set", (id) => {
    const tokens = resolveTokens(css, id);
    for (const name of required) expect(tokens[name], name).toBeTruthy();
  });

  it("fixes the exact base and animates orb ripples only while speaking", () => {
    expect(css).toContain("--background: #2d2b29");
    expect(css).not.toContain('[data-colorway="pink"]');
    expect(css).not.toContain('[data-colorway="turquoise"]');
    expect(css).toContain(".orb-state-speaking .orb-ripple-ring");
    const baseRing = css.match(/\.orb-ripple-ring\s*\{([^}]*)\}/s)?.[1] ?? "";
    expect(baseRing).not.toContain("animation:");
  });
});

describe("Shapher contrast", () => {
  const pairs: [string, string, number][] = [
    ["--foreground", "--background", 4.5],
    ["--card-foreground", "--card", 4.5],
    ["--popover-foreground", "--popover", 4.5],
    ["--muted-foreground", "--card", 3],
    ["--primary-foreground", "--primary", 4.5],
    ["--primary", "--background", 3],
  ];

  for (const colorway of colorwayIds) {
    for (const exposure of exposures) {
      it(`${colorway} / ${exposure} keeps text and highlights readable`, () => {
        const t = resolveTokens(css, colorway, exposure);
        for (const [fg, bg, min] of pairs) {
          const ratio = contrastRatio(t[fg]!, t[bg]!);
          expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
        }
      });
    }
  }
});
