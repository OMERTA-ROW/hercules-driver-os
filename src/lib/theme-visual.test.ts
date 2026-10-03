/**
 * VISUAL REGRESSION — flat bubble styling and readable contrast across
 * every screen and every theme, checked from the real stylesheet and the
 * real component source instead of blessed screenshots.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import {
  colorwayIds,
  contrastRatio,
  exposures,
  findSquareControls,
  parseBlocks,
  parseOklch,
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

  it("falls back to solid surfaces without blur or with reduced transparency", () => {
    expect(css).toContain("@supports not (backdrop-filter: blur(4px))");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
  });

  it("honours a driver's reduced-motion choice as well as the system setting", () => {
    expect(css).toContain('[data-motion="reduced"]');
    expect(css).toContain('[data-motion="full"]');
  });
});

describe("three flat themes", () => {
  const required = [
    "--background",
    "--card",
    "--popover",
    "--foreground",
    "--primary",
    "--border",
    "--ring",
  ];

  it.each(colorwayIds)("%s defines a complete flat token set", (id) => {
    const tokens = resolveTokens(css, id);
    for (const name of required) expect(tokens[name], name).toBeTruthy();
  });

  it("removes legacy color choices and animates ripples only while speaking", () => {
    expect(css).not.toContain('[data-colorway="pink"]');
    expect(css).not.toContain('[data-colorway="turquoise"]');
    expect(css).toContain(".orb-state-speaking .orb-ripple-ring");
    expect(css).not.toMatch(/\.orb-ripple-ring\s*\{[^}]*animation:/s);
  });
});

describe("contrast in every colorway and exposure", () => {
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
