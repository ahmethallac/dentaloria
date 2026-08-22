# Browser backend — the in-app browser

How to drive the browser for the verify pass in this repo. The method is tool-agnostic;
only the call names change. Playwright MCP, Chrome MCP or the in-app browser all work —
the one hard requirement is a channel that can evaluate JavaScript in the page.

## Tool mapping

| Upstream | Here |
|---|---|
| `browser_navigate` | `mcp__Claude_Browser__navigate` |
| `browser_snapshot` | `mcp__Claude_Browser__read_page` (returns `ref_N` handles) |
| `browser_evaluate` | `mcp__Claude_Browser__javascript_tool` |
| `browser_resize` | `mcp__Claude_Browser__resize_window` |
| `browser_take_screenshot` | `mcp__Claude_Browser__computer {action:"screenshot"}` |
| `browser_click` / `browser_fill` | `mcp__Claude_Browser__computer` / `form_input` |
| `browser_console_messages` | `mcp__Claude_Browser__read_console_messages` |
| `browser_network_requests` | `mcp__Claude_Browser__read_network_requests` |

Start the server with `preview_start({name: "dentaloria-dev"})` — port 8080. Never Bash.

## B1 — the replayable flow

Public pages need no auth, so the flow is usually one call:

```
preview_start({name: "dentaloria-dev"})
navigate("http://localhost:8080/")
```

Re-run the identical sequence every iteration. If a screen needs auth (`/dashboard`,
`/admin`, `/clinic-panel`), script the login through `form_input` + `computer` and keep the
credentials out of the transcript — never paste them into a report.

## B2 — capture, and its honest limit

`resize_window` sets the viewport (`{width, height}` or the `desktop`/`tablet`/`mobile`
presets, plus `colorScheme` for dark mode). Match the Figma frame width before capturing.

**Resolution is fine:** the page reports `devicePixelRatio: 2`, so upstream's "capture at
dpr ≥ 2" is met without any extra setup. Confirm it per run rather than assuming:

```js
JSON.stringify({dpr: devicePixelRatio, iw: innerWidth})
```

**What this backend cannot do** is write a screenshot to a **file on disk** — images come
back into context. So a pixel-diff between two PNGs is not possible here without installing
Playwright MCP (`claude mcp add playwright -- npx @playwright/mcp@latest`). The numeric pass
is the stronger check regardless; just say which one you actually ran.

Screenshots are also unreliable straight after scrolling in the in-app browser — capture
after a fresh `navigate`, or shift the page with a temporary negative `margin-top` and
capture that. Trust the DOM measurements over the image.

## B5 — the numeric pass

Paste the upstream reader into the page once, then call it:

```js
// javascript_tool, call 1: paste the whole of
//   .claude/skills/dentaloria-ui-fidelity/scripts/web-style-read.js
// It installs globalThis.__webStyleRead.

// call 2:
JSON.stringify(__webStyleRead([
  '[data-fid="header"]',
  '[data-fid="header.nav"]',
  '[data-fid="hero"]',
  '[data-fid="hero.title"]',
]))
```

The reader normalizes colors to hex and rounds box values, and flags the `gap`-vs-`marginTop`
false PASS. Then take each measured hex through `scripts/token-map.mjs --lookup` to get the
token name before you label the row — a bare hex delta is not a finding.

A Vite/React note: `read_page` after an HMR update can return the pre-update tree. Re-run it,
or `navigate` to the same URL, before trusting a measurement taken right after an edit.

## Structural check (cheap, do it first)

`read_page` returns the accessibility tree — role, name, order, hierarchy. Reading it before
the per-property pass catches "wrong element / missing label / wrong order" in one call, and
survives the layout refactor you are about to do.
