---
name: dentaloria-ui-fidelity
description: Build or verify dentaloria UI against its Figma design. Use when the user shares a dentaloria Figma node, says "match the Figma", "make it identical", "pixel perfect", "UI redesign", or asks whether a built screen matches the design.
---

# dentaloria UI fidelity

Read a Figma node into exact values, build from them, then prove the running
page matches by **measuring rendered styles** — never by eyeballing a
screenshot. Fine-grained spatial judgement from an image is unreliable; a 4px
gap and a 600-vs-500 weight both survive a confident "looks right".

Method adapted from [figma-design-skills](https://github.com/jeltehomminga/figma-design-skills)
(MIT), reduced to this repo's stack. `scripts/web-style-read.js` comes from it
verbatim apart from one doc pointer repointed at this file.

---

## 0. The reference file is a traced screenshot

Read this before trusting any number out of Figma file `rG45fV5ueTZIz2dljpFWCW`.

It is a PNG auto-traced into vectors, not a design source. `get_variable_defs`
returns `{}`. There is no auto-layout and there are no components — every node
is an absolutely positioned rectangle or text run. The frame is **863px wide**
and the layer names are OCR misreads ("Vorified Clinic", "4.8/$",
"Dentaioria"). Its numbers are measurements of a JPEG.

Consequences, all of which have already bitten:

- Six nav links came back as six different greys. That is antialiasing, not
  design. **Where the trace disagrees with itself, design intent wins.**
- Coordinates carry jitter (`x=-3`, `y=-6`, `rounded-[7.25px]`, a bar with 52px
  of left margin and 49px of right). Round it out.
- Font sizes read 7–8px because of the 863px frame. Scale before judging.
- Colours can only be sampled from antialiased pixels, so they are close
  approximations, not values.

**Scale factor: 1440 / 863 = 1.6686.** Multiply traced values, then snap to the
4px grid. Never quote a traced number as if it were a design decision.

---

## Preflight

1. **Figma MCP authorised?** Without `get_variable_defs` / `get_metadata` there
   is no extraction, only guessing. Do not silently downgrade to reading a
   screenshot and call the result "one-to-one".
2. **Dev server.** `preview_start({name: "dentaloria-dev"})`, port 8080.
   *Known bug:* it has served a stale copy of this project from another
   session's scratchpad. Check the root before trusting what you see:
   `lsof -nP -iTCP:8080 -sTCP:LISTEN -t | xargs -I{} lsof -a -p {} -d cwd -Fn`.
   If it is wrong, run `npx vite --port 8081` from the repo and point the
   browser there.
3. **Supabase reachable?** Most sections fetch. An empty grid is usually a down
   backend or thin data, not a layout bug — the local DB returns 2 clinics and
   3 cities against a design that shows 4 of each.
4. **Locale.** Copy comes from i18n, not literals. A text mismatch is a locale
   question first, a drift finding second.

---

## Extract

Keep every call node-scoped; `get_metadata` on a whole page blows the budget.

- `get_metadata(nodeId)` — structure, sizes, positions. The tree is the honest
  part of a traced file.
- `get_design_context(nodeId)` — reference markup. Treat as a hint. Load the
  `figma-design-to-code` skill first; the MCP server requires it.
- `get_screenshot(nodeId)` — visual reference only. **Never measure from it.**
- `get_variable_defs(nodeId)` — returns `{}` for this file. Sample colours off
  the rendered PNG instead and convert HSL-exact.

Produce a spec table — `element | property | figma value | repo token` — before
writing code. It is the build contract and the verify checklist.

Figma reports `letterSpacing` as a **percent**: `-2` means `-0.02em`, which at
24px renders `-0.48px`. Convert the spec side before comparing, every time.

---

## Build — this repo's traps

### The radius scale is not Tailwind's

`--radius: 1rem`, and the config derives the rest by subtraction:

| class | here | Tailwind default |
|---|---|---|
| `rounded-lg` | **16px** | 8px |
| `rounded-md` | **14px** | 6px |
| `rounded-sm` | **12px** | 2px |

A Figma radius of 12 is `rounded-sm` here. Reach for `rounded-lg` out of habit
and you ship 16px against a 12px design, and it reads as "roughly right" in
every visual pass. There is no 8px in this scale — small chips use an explicit
`rounded-[6px]` so they do not become pills.

### Tailwind's `text-*` utilities carry a line-height

`lg:text-5xl` sets `line-height: 1` from inside its media query and silently
overrides a bare `leading-[1.12]`. This collapsed the headline from 107px to
96px and shifted four blocks below it. Bake the leading into the size —
`text-5xl/[1.12]` — so there is nothing left to override.

### Colours are HSL triplets, so a measured value never greps

Tokens live in `src/index.css` as `--primary: 220.7 96.8% 51.0%`, consumed via
`hsl(var(--primary))`. The browser reports `rgb(9, 87, 251)`. Neither string
matches, so a naive search reports every value as hardcoded. Resolve properly:

```bash
node .claude/skills/dentaloria-ui-fidelity/scripts/token-map.mjs --lookup 'rgb(9, 87, 251)'
```

It prints the token name, or `HARDCODED` plus the nearest token and its
distance. Details in [`references/tokens.md`](references/tokens.md).

### Spacing is the stock 4px grid

The config does not extend `spacing`. Container column is **1264px centred**
(x=88 at 1440) — every section sits on it via `SectionShell`.

### Check the component is alive before editing it

This repo has Lovable-era leftovers. `src/components/ui/hero-section.tsx` was
exported and imported by nothing. Grep for the import first; editing a dead
file produces a perfect diff and zero visual change.

### There are no test ids

`grep -r data-testid src/` returns zero. Class chains are not stable across a
redesign — that is the thing being changed. Add `data-fid="<element>.<part>"`
attributes **as part of the build**, not after, so the numeric pass has stable
targets.

---

## Verify

Never report "matches the design" without the numeric pass. A clean visual
comparison is not proof.

1. Run the app, navigate, and record the path so every re-check measures the
   same state.
2. Read the rendered values — see
   [`references/browser-backend.md`](references/browser-backend.md) for the
   tooling and the `web-style-read.js` reader.
3. Walk every spec row: spec vs measured, with a verdict.
4. Fix highest-severity first, re-measure. **Cap at ~3 iterations**, then
   report what remains honestly. Self-correction saturates fast and unbounded
   loops undo their own fixes.

**Resolve every measured value back to a token before labelling a row.** A bare
hex or px delta is not a finding — it does not say whether someone typed a
literal, reached for the wrong token, or whether the token itself is wrong.

| verdict | meaning | where the fix goes |
|---|---|---|
| `PASS` | matches spec | — |
| `DRIFT` | resolves to a token, but not the spec's. Name **both** | the component reached for the wrong token |
| `HARDCODED` | resolves to no token | a literal was typed in |
| `VARIANT` | element is in a different state than the Figma node | nothing — re-pick the node |
| `MISSING` | selector matched nothing | your targets. This run verified less than it looks |

Check `VARIANT` **first**: if the rendered state differs from the node, every
delta below it is noise. `MISSING` is an error, never a pass.

**Tolerance:** rendered boxes are fractional, so compare position and size with
±1px — and against a traced source, ±3px, since 2px of jitter at 863 is 3.3px
here. Colours, weights and radii compare exactly.

---

## Guardrails

- Never write a raw hex, px or font-weight literal into a component.
- Never trust `rounded-lg` to be 8px here. It is 16.
- Never measure from a screenshot — either side.
- Never edit a component without confirming something imports it.
- A content mismatch is a locale question before it is a drift finding.
