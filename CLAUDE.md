# dentaloria

Vite + React + TypeScript, Tailwind, shadcn/ui, Supabase, react-i18next.
Locales: **tr and en only** (`src/i18n/locales/<loc>/*.json`).

## Running it

Use the Browser pane's `preview_start` with `dentaloria-dev` (port 8080) — never
`npm run dev` through Bash. Check with `npx tsc --noEmit -p tsconfig.app.json`
and `npx vite build` before proposing a commit.

## Design tokens

Colours live in `src/index.css` as **bare HSL triplets** (`--primary: 220.7 96.8% 51.0%`)
consumed via `hsl(var(--x))`. The browser reports `rgb(...)`, so grepping a measured
colour finds nothing. Resolve it instead:

```bash
node .claude/skills/dentaloria-ui-fidelity/scripts/token-map.mjs --lookup 'rgb(9, 87, 251)'
```

The brand palette is **four colours**: Dentaloria blue `#0957fb` (`--primary`),
night navy `#062051` (`--stats-navy`), ink `#2e385d` (`--brand-navy`), ice
`#f0f5ff` (`--brand-ice`). Everything else is a tint of those; body-copy grey
(`--nav-muted`) and functional green/red are not brand colours. Do not add
`blue-600`, purple or teal — `--gradient-*` tokens are brand-only now.

`--radius: 1rem`, so `rounded-lg` is **16px** here, not Tailwind's 8. Check the
number, not the name. Spacing is the stock 4px grid.

## Home hero — `src/components/home/HomeHero.tsx`

The most-iterated part of the site. What is settled:

- **Content column is 1264px**, the same one `navbar.tsx` uses, so the eyebrow,
  headline, card and stats line up with the logo. Do not change this.
- Desktop geometry, signed off by the client at a 1655px viewport:
  `photo 0..612` · `card 404..598 x=268 w=1120` · `stats 626 x=196 w=1264` · `eyebrow 124`.
  Re-measure against these after any hero change.
- The photo band runs **up behind the header** (`-top-20`), which is what the
  translucent header fades over. Its bottom is an ellipse: a white shape with cut
  **top** corners, not a photo with cut bottom corners — a bottom radius curves the
  arc the wrong way up.
- A `/` inside a Tailwind arbitrary value is parsed as the opacity separator, so
  two-radius forms like `rounded-b-[50%_/_46px]` compile to **nothing, silently**.
  Use arbitrary properties or plain CSS.
- The popular-search chips carry canonical English `treatment`/`city` names in
  `home.json`; the click resolves them against loaded data in `Index.tsx`.
  "Hollywood Smile" and "Estetik Diş Hekimliği" are **not rows in the treatments
  table** and point at the nearest real one.

Mobile (below `lg`), approved at 390px: the photo stays a backdrop running
behind the header (`-top-20`, 380px tall), drawn 900px wide and pinned by its
right edge so her face sits on the right. The client chose a **small headline**
(22px, 20px under 380px, capped at 235px wide) so it ends before her face, and
only **two** trust badges — "Şeffaf Fiyatlar" is desktop-only because a third
lands on her face. Check TR *and* EN: the EN headline is longer.

## Working from design comps — read this first

Comps arrive as **screenshots, not Figma files**. Two things have cost days:

1. **Never derive px values by eyeballing the raster.** Measure a known anchor
   (the 1264 column, a 50px select) to get the comp's scale, then convert. Better
   still, ask for the numbers.
2. **The mobile comps are drawn at ~620px wide; real phones are 390px.** Their
   text-left / subject-right split does not survive the difference: at 390 the
   headline cannot both stay large and clear her face. Say so before writing any
   code and let the client choose the trade-off — eight rounds went into
   discovering this by trial and error, and the result was still rejected.

Verify with **DOM measurements** (`getBoundingClientRect` via `javascript_tool`),
not screenshots — they are cheap, exact, and do not bloat the session. Take a
screenshot only at decision points, at reduced scale.

## Known issues, not yet fixed

- **768px has horizontal page overflow, from the header.** `header.nav` and
  `header.actions` appear at `md` but do not fit until ~1100px. Only change
  `navbar.tsx` when the client asks; "Destinations" and "How It Works" were
  removed from its menu at their request (the footer still links to both).
- **The hero's language filter never applies.** `Index.tsx` writes `language=`
  into the URL; `ClinicListing.tsx` reads `languages=`. Pre-existing.
- `StatsBar`'s `dark` tone is unused since the hero grew its own stats row.

## Clinic invites (admin → "Klinik daveti")

Three tabs in `src/components/admin/OutreachDrafts.tsx`: **collect** (a listing →
draft pages via `collect-clinics`), **email** (`outreach-find-contacts` scans the
clinic's own website for an address, `outreach-send-invites` mails it through
Resend), **whatsapp** (message + number + `wa.me` link; nothing is sent).

- **collect** reads two sources, behind one `Scraped` shape: booking.dentist
  (schema.org JSON-LD + the Next.js flight payload) and whatclinic.com (JSON-LD
  + RDFa `property=` attributes). The count is clinics **created**, not pages
  read — anything already in `clinics` is skipped without spending quota, so
  re-running the same URL continues the listing. It stops at a time budget and
  says so rather than being killed mid-clinic.
- whatclinic caveats: it publishes **no phone and no website** (both sit behind
  its enquiry form), so "find emails" cannot help there — the address is typed
  in by hand, or arrives with the Google Business match. Its prices are TL, so
  treatments land with `starting_price_euro` null rather than a converted
  number. No videos are imported from it.
- The scraper's `UA` must stay a recent Chrome: whatclinic answers 403
  "Client-OldBrowserSpam" to older ones. Every clinic failing at once is the
  symptom.
- The **email** tab is two lists: never-mailed and already-mailed. The second
  one sends the reminder (`outreach_templates.channel = 'email_reminder'`),
  repeatably — it counts on `invite_reminder_count` / `invite_reminder_sent_at`
  and never touches `invite_sent_at`, which stays the record of first contact.
- Admin → approvals splits the same `clinic_approvals` rows into clinics we
  invited and clinics that applied themselves, by whether the row carries
  invite machinery (`preview_token` / `invite_sent_at` / `expires_at` /
  `consent_at`). They used to be one list, and real applications got lost in it.
- Per-invite state lives on `clinic_approvals` (`invite_locale`, `contact_email`,
  `whatsapp_phone`, `invite_sent_at`, …); texts in `outreach_templates`.
  Placeholders are `{{clinic}}` and `{{link}}`.
- `invite_locale` is the language of the **approval bar and invite messages only**.
  The draft page itself follows the site locale. TR invites link to `/tr/p/<token>`.
- Rejecting deletes the clinic and writes `outreach_suppressions`; the send
  function refuses anyone on that list. Never bypass it.
- The frontend selects the new columns, so the migrations
  (`20260914120000_outreach_campaigns.sql`, `20260916120000_outreach_reminders.sql`)
  and the functions must be deployed **before** the frontend that uses them.
  Miss that order and the whole panel reads empty: PostgREST 400s the select.
- **`supabase db push` is not usable on this project.** `supabase migration list`
  shows most local migrations with an empty `remote` column even though they are
  live, so a push would try to replay them all. Apply new SQL by pasting it into
  the Supabase SQL editor, and keep the migration file in the repo as the record.
  `supabase functions deploy <name>` is fine and is how the functions ship.

