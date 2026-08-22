/* =============================================================================
 * web-style-read.js — rendered-style reader for the web half of step B5
 * =============================================================================
 *
 * WHAT IT DOES
 *   Reads the *resolved, post-cascade* style off live DOM elements — the
 *   rendered truth, not the source. Colors come back normalized to hex, box
 *   values rounded to the nearest px, and the raw computed strings are kept
 *   alongside so you can audit the normalization instead of trusting it.
 *
 * HOW TO RUN IT
 *   Paste this whole file into the page once (Playwright `page.evaluate`, or
 *   your browser MCP's JS-eval tool). It installs `globalThis.__webStyleRead`.
 *   Then call it with your selectors:
 *
 *     JSON.stringify(__webStyleRead([
 *       '[data-testid="pricing-card"]',
 *       '[data-testid="pricing-card"] h3',
 *     ]))
 *
 *   Wrapping in JSON.stringify is harmless in a browser and required by some
 *   eval channels that only marshal primitives. Do it by default.
 *
 * IT ALSO LOADS IN NODE
 *   `require('./web-style-read.js')` exports the pure normalizers, so they can
 *   be unit-tested without a browser. `readAll` needs a DOM. The browser
 *   globals install only when a document is present, so the Node module stays
 *   side-effect-free.
 *
 * WHAT IT NORMALIZES, AND WHY EACH ONE MATTERS
 *   - color / backgroundColor / borderColor: computed values are always
 *     `rgb()` / `rgba()`. `#3366cc` and `rgb(51,102,204)` are the SAME value;
 *     comparing the strings reports a false FAIL. Fully transparent
 *     (`rgba(0,0,0,0)`) normalizes to `transparent` — "no background" is a
 *     different finding from "wrong background".
 *   - box + position: getBoundingClientRect() returns FRACTIONAL px (sub-pixel
 *     layout, zoom, devicePixelRatio). `123.5 === 124` produces noisy FAILs, so
 *     these are rounded. Allow ±1px on top when you compare.
 *   - letterSpacing: computed is `"normal"` when unset, never `"0px"`. And the
 *     Figma spec side is a PERCENT (-2 means -0.02em) — convert the spec, not
 *     the measurement. See the Extract section of ../SKILL.md.
 *   - gap: read on the flex/grid CONTAINER, never the children. A container
 *     that spaces its children with `marginTop` instead of `gap` reports
 *     `gap: "normal"` while looking correct — `gapDrift` below flags exactly
 *     that, because it is the single most common false PASS on the web side.
 * ===========================================================================*/

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof document !== "undefined") {
    root.__webStyleRead = api.readAll;
    root.__webStyleReadInternals = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function hexByte(n) {
    var s = (n & 0xff).toString(16);
    return s.length === 1 ? "0" + s : s;
  }

  // "rgb(51, 102, 204)" -> "#3366cc"; "rgba(0,0,0,0)" -> "transparent";
  // "rgba(0,0,0,0.5)" -> "#00000080"; "#ABC" -> "#aabbcc"; anything else, as-is.
  function normalizeColor(v) {
    if (v == null) return v;
    if (typeof v !== "string") return v;
    var s = v.trim().toLowerCase();
    if (s === "transparent") return "transparent";
    if (s[0] === "#") {
      if (s.length === 4) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
      if (s.length === 5) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4];
      return s;
    }
    var m = s.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return s; // named color, "currentcolor", color(display-p3 ...) — leave raw
    var p = m[1].split(/[,\s/]+/).filter(Boolean);
    var r = parseInt(p[0], 10), g = parseInt(p[1], 10), b = parseInt(p[2], 10);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return s;
    var a = p.length > 3 ? parseFloat(p[3]) : 1;
    if (!isNaN(a) && a === 0) return "transparent";
    var hex = "#" + hexByte(r) + hexByte(g) + hexByte(b);
    if (!isNaN(a) && a < 1) hex += hexByte(Math.round(a * 255));
    return hex;
  }

  // "12.5px" -> 13 ; "0px" -> 0 ; "normal" -> null ; 123.5 -> 124
  function roundPx(v) {
    if (v == null) return null;
    var n = typeof v === "number" ? v : parseFloat(v);
    if (isNaN(n)) return null;
    return Math.round(n);
  }

  // Computed letterSpacing is "normal" when unset, not "0px". Keep that distinction:
  // "normal" is "the font decides", 0 is "explicitly none".
  function normalizeLetterSpacing(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (s === "normal") return "normal";
    var n = parseFloat(s);
    return isNaN(n) ? s : Math.round(n * 100) / 100;
  }

  // Figma reports letterSpacing as a percent. -2 means -0.02em, which at
  // fontSize px renders as (percent/100)*fontSize px. Convert the SPEC side
  // before comparing it to the measurement.
  function figmaLetterSpacingToPx(percent, fontSizePx) {
    if (percent == null || fontSizePx == null) return null;
    return Math.round((percent / 100) * fontSizePx * 100) / 100;
  }

  // A container that has no `gap` but whose children carry a uniform non-zero
  // top margin is spacing by margin. It looks right and measures wrong.
  function detectGapDrift(cs, childMargins) {
    var isFlexOrGrid = /flex|grid/.test(cs.display || "");
    var gapUnset = !cs.gap || cs.gap === "normal";
    if (!isFlexOrGrid || !gapUnset) return null;
    var nonZero = (childMargins || []).filter(function (m) { return roundPx(m) > 0; });
    if (nonZero.length === 0) return null;
    return "container has no gap; " + nonZero.length + " children space with marginTop (" + nonZero[0] + ")";
  }

  function readSpec(selector) {
    var el = document.querySelector(selector);
    if (!el) return { selector, error: "not found", verdict: "MISSING" };

    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();

    var childMargins = Array.prototype.slice.call(el.children).map(function (c) {
      return getComputedStyle(c).marginTop;
    });

    return {
      selector: selector,

      // normalized — compare against these
      color: normalizeColor(cs.color),
      backgroundColor: normalizeColor(cs.backgroundColor),
      borderColor: normalizeColor(cs.borderTopColor),
      fontFamily: cs.fontFamily,
      fontSize: roundPx(cs.fontSize),
      fontWeight: String(cs.fontWeight),
      lineHeight: cs.lineHeight === "normal" ? "normal" : roundPx(cs.lineHeight),
      letterSpacing: normalizeLetterSpacing(cs.letterSpacing),
      borderRadius: roundPx(cs.borderTopLeftRadius),
      paddingTop: roundPx(cs.paddingTop),
      paddingRight: roundPx(cs.paddingRight),
      paddingBottom: roundPx(cs.paddingBottom),
      paddingLeft: roundPx(cs.paddingLeft),
      gap: cs.gap === "normal" ? null : roundPx(cs.rowGap),
      columnGap: cs.columnGap === "normal" ? null : roundPx(cs.columnGap),
      width: roundPx(r.width),
      height: roundPx(r.height),
      x: roundPx(r.x),
      y: roundPx(r.y),

      // diagnostics
      display: cs.display,
      gapDrift: detectGapDrift(cs, childMargins),

      // raw, so the normalization is auditable rather than trusted
      raw: {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderRadius: cs.borderTopLeftRadius,
        letterSpacing: cs.letterSpacing,
        gap: cs.gap,
        rect: { width: r.width, height: r.height, x: r.x, y: r.y },
      },
    };
  }

  function readAll(selectors) {
    var list = typeof selectors === "string" ? [selectors] : selectors || [];
    return {
      meta: {
        channel: "dom-computed-style",
        devicePixelRatio: typeof devicePixelRatio === "number" ? devicePixelRatio : null,
        returned: list.length,
        ts: null, // omitted so two reads of the same screen are byte-comparable
      },
      nodes: list.map(readSpec),
    };
  }

  return {
    readAll: readAll,
    readSpec: readSpec,
    normalizeColor: normalizeColor,
    roundPx: roundPx,
    normalizeLetterSpacing: normalizeLetterSpacing,
    figmaLetterSpacingToPx: figmaLetterSpacingToPx,
    detectGapDrift: detectGapDrift,
  };
});
