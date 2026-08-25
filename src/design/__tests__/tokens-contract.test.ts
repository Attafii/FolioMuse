// Design token contract tests (ADR-0005, docs/design/design-tokens.md).
// DB-free, no deps, node env: reads src/app/globals.css from the filesystem
// and asserts (1) the token contract (names in both modes, no pure black or
// white, reduced-motion override, motion tokens, single accent family) and
// (2) WCAG AA contrast (>= 4.5:1) for every semantic pair in BOTH modes,
// including the badge status tint pattern (text on bg-{status}/10).
//
// Rule (plan T9): never weaken a threshold to make a test pass. If a pair
// fails, the TOKEN is wrong; fix it in globals.css, not here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const CSS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../app/globals.css");
const css = readFileSync(CSS_PATH, "utf8");

// ---- pure color math (CSS Color 4 oklch -> sRGB, WCAG 2.1) ----

interface Oklch {
  l: number;
  c: number;
  h: number;
}

const OKLCH_RE = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function oklchToOklab({ l, c, h }: Oklch): { l: number; a: number; b: number } {
  const hr = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

/** oklab -> linear-light sRGB (CSS Color 4 section 12.4). */
function oklabToLinearSrgb(oklab: { l: number; a: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  const { l, a, b } = oklab;
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  return {
    r: clamp01(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: clamp01(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: clamp01(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

/** sRGB transfer functions (CSS Color 4 section 12.2). */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance from linear-light RGB. */
function relativeLuminance(linear: { r: number; g: number; b: number }): number {
  return 0.2126 * linear.r + 0.7152 * linear.g + 0.0722 * linear.b;
}

function contrastOf(aLum: number, bLum: number): number {
  const [hi, lo] = aLum >= bLum ? [aLum, bLum] : [bLum, aLum];
  return (hi + 0.05) / (lo + 0.05);
}

function contrastBetween(a: Oklch, b: Oklch): number {
  return contrastOf(
    relativeLuminance(oklabToLinearSrgb(oklchToOklab(a))),
    relativeLuminance(oklabToLinearSrgb(oklchToOklab(b))),
  );
}

/**
 * Background a `bg-{status}/10` badge renders as: color-mix(in oklab,
 * status 10%, transparent) composited over the page background. Model the
 * composite in gamma sRGB (canvas default), then linearize for luminance.
 */
function tintOverBackground(status: Oklch, background: Oklch, pct = 0.1): number {
  const s = oklabToLinearSrgb(oklchToOklab(status));
  const b = oklabToLinearSrgb(oklchToOklab(background));
  const mixedGamma = {
    r: pct * linearToSrgb(s.r) + (1 - pct) * linearToSrgb(b.r),
    g: pct * linearToSrgb(s.g) + (1 - pct) * linearToSrgb(b.g),
    b: pct * linearToSrgb(s.b) + (1 - pct) * linearToSrgb(b.b),
  };
  return relativeLuminance({
    r: srgbToLinear(mixedGamma.r),
    g: srgbToLinear(mixedGamma.g),
    b: srgbToLinear(mixedGamma.b),
  });
}

// ---- token parsing ----

function extractBlock(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = source.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : "";
}

function parseVarMap(block: string): Map<string, string> {
  // Strip CSS comments first: a comment shares the leading segment before
  // the first `;`, which would otherwise break parsing of the first token.
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, "");
  const map = new Map<string, string>();
  for (const line of clean.split(";")) {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function resolveOklch(
  name: string,
  blockMap: Map<string, string>,
  primitives: Map<string, string>,
): Oklch {
  const raw = blockMap.get(name);
  if (!raw) throw new Error(`token ${name} is missing from its mode block`);
  let value = raw;
  const varRef = value.match(/^var\((--[\w-]+)\)$/);
  if (varRef) {
    const prim = primitives.get(varRef[1]);
    if (!prim) throw new Error(`token ${name} references undefined var ${varRef[1]}`);
    value = prim;
  }
  const m = value.match(OKLCH_RE);
  if (!m) throw new Error(`token ${name} does not resolve to oklch: "${value}"`);
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

const rootBlock = extractBlock(css, ":root");
const darkBlock = extractBlock(css, ".dark");
const rootMap = parseVarMap(rootBlock);
const darkMap = parseVarMap(darkBlock);
// Primitive ramps live in :root and are shared by both modes.
const primitives = new Map(
  [...rootMap].filter(([name]) => /^--(paper|ink|cobalt)-/.test(name)),
);

const REQUIRED_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "success",
  "warning",
  "info",
];

const CONTRAST_PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
];

const STATUS_COLORS = ["success", "warning", "info", "destructive"];

// ---- contract tests ----

describe("design token contract (src/app/globals.css)", () => {
  it("defines every required token in both :root and .dark", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(rootMap.has(`--${token}`), `light mode --${token}`).toBe(true);
      expect(darkMap.has(`--${token}`), `dark mode --${token}`).toBe(true);
    }
  });

  it("uses no pure black or pure white literals", () => {
    expect(css.match(/#000|#fff|#000000|#ffffff/)).toBeNull();
  });

  it("has the prefers-reduced-motion override block", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("declares motion duration and easing tokens", () => {
    expect(css).toMatch(/--duration-(fast|base|slow)\s*:/);
    expect(css).toMatch(/--ease-(standard|spring)\s*:/);
  });

  it("keeps one interface accent (cobalt 255) plus the documented profession data-hue grid", () => {
    // Interface accent stays cobalt-only. The profession tint system adds a
    // CLOSED semantic hue grid (docs/design/design-tokens.md §Profession
    // tints): rose 350, emerald 162, indigo 278, fuchsia 322, sky 232,
    // orange 55, lime 135, red 27, slate 261, amber 78, brown 69,
    // steel 241, green 151, pink 342, cyan 197, developer-neutral 250.
    const allowed = new Set([
      25, 27, 45, 50, 55, 60, 65, 69, 70, 75, 78, 80, 135, 150, 151, 162, 197,
      232, 241, 250, 255, 256, 261, 278, 322, 342, 350,
    ]);
    for (const m of css.matchAll(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)) {
      const hue = parseFloat(m[1]);
      expect(allowed.has(hue), `undocumented hue family ${hue}`).toBe(true);
    }
    // Accent-role tokens (primary, ring, accent, info) resolve to cobalt only.
    for (const [mode, map] of [
      ["light", rootMap],
      ["dark", darkMap],
    ] as const) {
      for (const role of ["primary", "ring", "accent", "info"]) {
        const token = resolveOklch(`--${role}`, map, primitives);
        expect(token.h, `${mode} --${role} should be cobalt`).toBe(255);
      }
    }
  });

  it("resolves every required token to a concrete oklch in both modes", () => {
    for (const token of REQUIRED_TOKENS) {
      expect(() => resolveOklch(`--${token}`, rootMap, primitives)).not.toThrow();
      expect(() => resolveOklch(`--${token}`, darkMap, primitives)).not.toThrow();
    }
  });
});

describe("WCAG AA contrast (>= 4.5:1) in both modes", () => {
  for (const [mode, map] of [
    ["light", rootMap],
    ["dark", darkMap],
  ] as const) {
    for (const [fg, bg] of CONTRAST_PAIRS) {
      it(`${mode}: ${fg} on ${bg}`, () => {
        const ratio = contrastBetween(
          resolveOklch(`--${fg}`, map, primitives),
          resolveOklch(`--${bg}`, map, primitives),
        );
        console.log(`  ${mode} ${fg}/${bg}: ${ratio.toFixed(2)}:1`);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const status of STATUS_COLORS) {
      it(`${mode}: badge ${status} text on ${status}/10 tint over background`, () => {
        const text = resolveOklch(`--${status}`, map, primitives);
        const background = resolveOklch("--background", map, primitives);
        const textLum = relativeLuminance(oklabToLinearSrgb(oklchToOklab(text)));
        const tintLum = tintOverBackground(text, background, 0.1);
        const ratio = contrastOf(textLum, tintLum);
        console.log(`  ${mode} badge ${status}/10: ${ratio.toFixed(2)}:1`);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
