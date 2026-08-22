#!/usr/bin/env node
/* =============================================================================
 * token-map.mjs — reverse-lookup table for dentaloria's design tokens
 * =============================================================================
 *
 * WHY THIS EXISTS
 *   The core rule of the verify pass is: resolve every MEASURED value back to
 *   a named token before labelling the row. Otherwise you can't tell DRIFT
 *   (wrong token) from HARDCODED (no token) — two different fixes.
 *
 *   In this repo that reverse-lookup is not trivial. Tokens live in
 *   src/index.css as BARE HSL TRIPLETS (`--primary: 220 91% 56%`), consumed as
 *   `hsl(var(--primary))`. The browser reports `rgb(37, 108, 240)`. Neither
 *   string matches the other, so a naive grep for the measured value finds
 *   nothing and every row falsely classifies as HARDCODED.
 *
 *   This script converts every token to hex once, so measured hex can be looked
 *   up directly.
 *
 * USAGE
 *   node token-map.mjs                    # print the whole table
 *   node token-map.mjs --json             # machine-readable
 *   node token-map.mjs --lookup '#256cf0' # what token is this? (DRIFT vs HARDCODED)
 *   node token-map.mjs --lookup 'rgb(37, 108, 240)'
 *   node token-map.mjs --theme dark       # resolve against .dark instead of :root
 *
 * NOTE ON NON-COLOR TOKENS
 *   --radius (1rem) and the gradient/shadow tokens are printed too, but they are
 *   not part of the color reverse-lookup — a gradient measures as
 *   `background-image`, not a color, and must be compared as its raw string.
 * ===========================================================================*/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = resolve(HERE, "../../../../src/index.css");

// --- color math -------------------------------------------------------------

// "220 91% 56%" -> "#256cf0". Returns null for anything that isn't a triplet.
export function hslTripletToHex(triplet) {
  const m = String(triplet).trim().match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return "#" + [v, v, v].map(byte).join("");
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rgb = [h + 1 / 3, h, h - 1 / 3].map((t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  });
  return "#" + rgb.map((c) => byte(Math.round(c * 255))).join("");
}

function byte(n) {
  return (n & 0xff).toString(16).padStart(2, "0");
}

// Accepts "#abc", "#aabbcc", "rgb(1,2,3)", "rgba(1,2,3,0.5)" -> "#aabbcc"
export function toHex(v) {
  const s = String(v).trim().toLowerCase();
  if (s.startsWith("#")) {
    if (s.length === 4) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return s.slice(0, 7);
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
  if (p.length < 3 || p.some(isNaN)) return null;
  return "#" + p.slice(0, 3).map((c) => byte(Math.round(c))).join("");
}

// --- parsing ----------------------------------------------------------------

// Pull one CSS block's custom properties. `selector` is ":root" or ".dark".
export function parseBlock(css, selector) {
  const start = css.indexOf(selector + " {");
  if (start === -1) return {};
  // Walk braces so nested hsl(...) and multi-line gradients don't end the block early.
  let depth = 0, i = css.indexOf("{", start), end = -1;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) { end = i; break; }
  }
  const body = css.slice(start, end);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return out;
}

export function buildTable(css, theme = "root") {
  const base = parseBlock(css, ":root");
  const vars = theme === "dark" ? { ...base, ...parseBlock(css, ".dark") } : base;

  const colors = {};   // token -> hex
  const other = {};    // token -> raw (gradients, shadows, radius, glass)
  for (const [name, raw] of Object.entries(vars)) {
    const hex = hslTripletToHex(raw);
    if (hex) colors[name] = hex;
    else other[name] = raw;
  }

  const byHex = {};    // hex -> [token, ...]  (aliases collapse here on purpose)
  for (const [name, hex] of Object.entries(colors)) (byHex[hex] ||= []).push(name);

  return { theme, colors, other, byHex };
}

// --- cli --------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1] ?? true; };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(CSS, "utf8");
  const table = buildTable(css, flag("--theme") === "dark" ? "dark" : "root");
  const lookup = flag("--lookup");

  if (lookup && lookup !== true) {
    const hex = toHex(lookup);
    if (!hex) { console.log(`could not parse "${lookup}" as a color`); process.exit(2); }
    const hits = table.byHex[hex];
    if (hits) {
      console.log(`${hex}  ->  ${hits.join(" / ")}   [verdict: token found — PASS if it is the spec's token, else DRIFT]`);
    } else {
      const near = nearest(hex, table.colors);
      console.log(`${hex}  ->  no token   [verdict: HARDCODED]`);
      console.log(`  nearest token: ${near.name} (${near.hex}, ${near.dist} away) — likely the one that was meant`);
    }
    process.exit(0);
  }

  if (flag("--json")) { console.log(JSON.stringify(table, null, 2)); process.exit(0); }

  console.log(`# dentaloria color tokens (${table.theme})  — src/index.css\n`);
  const w = Math.max(...Object.keys(table.colors).map((k) => k.length));
  for (const [name, hex] of Object.entries(table.colors)) {
    console.log(`${name.padEnd(w)}  ${hex}   tailwind: ${tw(name)}`);
  }
  console.log(`\n# non-color tokens (compare as raw strings, not via reverse-lookup)\n`);
  for (const [name, raw] of Object.entries(table.other)) {
    console.log(`${name}: ${raw.length > 90 ? raw.slice(0, 90) + " …" : raw}`);
  }
}

// Best-effort Tailwind class hint. tailwind.config.ts maps most --x to `x`.
function tw(name) {
  const n = name.replace(/^--/, "");
  const map = {
    background: "bg-background", foreground: "text-foreground",
    border: "border-border", input: "border-input", ring: "ring-ring",
    "medical-green": "text-medical-green / bg-medical-green",
    "medical-green-light": "bg-medical-green-light",
    "trust-gold": "text-trust-gold",
  };
  if (map[n]) return map[n];
  if (n.endsWith("-foreground")) return `text-${n.replace("-foreground", "")}-foreground`;
  if (/^(primary|secondary|accent|muted|card|popover|destructive)$/.test(n)) return `bg-${n} / text-${n}`;
  if (/^sidebar-/.test(n)) return n.replace("sidebar-", "sidebar-");
  return `(no direct class — check tailwind.config.ts)`;
}

function nearest(hex, colors) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = p(hex);
  let best = { name: "-", hex: "-", dist: Infinity };
  for (const [name, h] of Object.entries(colors)) {
    const [r2, g2, b2] = p(h);
    const d = Math.round(Math.sqrt((r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2));
    if (d < best.dist) best = { name, hex: h, dist: d };
  }
  return best;
}
