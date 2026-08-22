# dentaloria token map

Read this when filling the **repo token / class** column of the spec table, or when
reverse-looking-up a measured value at verify time.

Source of truth: [`src/index.css`](../../../../src/index.css) (`:root` and `.dark`),
surfaced through [`tailwind.config.ts`](../../../../tailwind.config.ts).

## The shape

```css
:root { --primary: 220 91% 56%; }        /* bare HSL triplet, no hsl() wrapper */
```
```ts
colors: { primary: { DEFAULT: 'hsl(var(--primary))' } }   /* config adds the wrapper */
```

Consequence: **you cannot grep a measured color to find its token.** The browser reports
`rgb(41, 109, 245)`, the CSS says `220 91% 56%`. Use the script:

```bash
node scripts/token-map.mjs                          # whole table, with tailwind class hints
node scripts/token-map.mjs --lookup '#296df5'       # -> --primary / --ring / --primary-blue
node scripts/token-map.mjs --lookup '#2a6df0'       # -> no token [HARDCODED], nearest --primary (5 away)
node scripts/token-map.mjs --theme dark             # resolve against .dark
node scripts/token-map.mjs --json                   # machine-readable
```

## Aliases collapse — say which token you mean

`#296df5` is `--primary`, `--ring`, **and** `--primary-blue`. The reverse-lookup returns all
three. That is not ambiguity in the measurement, it is three names for one value — pick the
one the spec row is about (a focus ring is `--ring`, a button fill is `--primary`) and do not
report a DRIFT just because the lookup listed a sibling.

## Radius — derived, and not Tailwind's defaults

```
--radius: 1rem
rounded-lg = var(--radius)        = 16px
rounded-md = calc(var(--radius) - 2px) = 14px
rounded-sm = calc(var(--radius) - 4px) = 12px
```

Figma `12` → `rounded-sm`. Figma `16` → `rounded-lg`. There is **no class for 8px** in this
scale; if the design wants 8, that is a new token, not `rounded-md`.

## Gradients and shadows are raw strings, not colors

`--gradient-primary`, `--gradient-hero`, `--shadow-elegant`, `--shadow-glow`, `--glass-bg`
etc. carry full CSS values. They measure as `background-image` / `box-shadow`, so compare
them as strings — the color reverse-lookup does not apply. Tailwind exposes them as
`bg-gradient-primary`, `shadow-elegant`, and friends.

Figma side: a gradient is usually **unbound** (no variable), so `get_variable_defs` will not
return it. Per upstream step 5, read `node.fills` via the Figma Plugin API for the
authoritative stops, and flag the missing binding as a design smell.

## Spacing

`tailwind.config.ts` does not extend `spacing` → stock 4px grid (`p-4` = 16px, `gap-2` = 8px).
Container is centered with `2rem` padding and a **1400px** `2xl` cap.

## Typography

No `fontFamily` / `fontSize` extension in the config → stock Tailwind type scale, and the
font comes from whatever `index.css` / `index.html` sets. Two conversions upstream warns
about, both live here:

- Figma `letterSpacing` is a **percent**: `-2` means `-0.02em` → at 24px that renders
  `-0.48px`. Convert the spec side before comparing, every time.
- Computed `letterSpacing` is the string `"normal"` when unset — not `"0px"`.

## Broken bindings — known, pre-existing

| Reference | Failure |
|---|---|
| `medical-light` (class) | var defined, **config key missing** → class never generated |
| `--trust-gold` | config key exists, **var undefined** → `hsl()` invalid |
| `--primary-light`, `--primary-dark` | same as above |

Both directions of the same mistake. Fix at the source (add the var, or add the config key),
never at the call site.
