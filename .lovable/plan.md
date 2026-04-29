# Listing Card Redesign

Reworks the clinic cards on `/clinic-listing` (desktop + mobile) for a cleaner, more modern, conversion-focused layout.

## 1. Smaller Google rating badge

In `src/components/ui/google-rating.tsx`:
- Reduce the "prominent" variant: smaller star (`w-4 h-4`), smaller text (`text-sm`), tighter padding (`px-2 py-0.5`), thinner border.
- Shorten the label everywhere from "Google Business Rating" to "Google Rating".
- Make the label show on mobile too (currently hidden in mobile card via `showLabel={false}`) — the label will be small enough to fit beside the score.

## 2. Replace single "View" button with stacked Apply + View Clinic

Remove the animated rotating right-side bar on desktop and the single "View Clinic" pill on mobile. Replace with two stacked buttons (same on desktop and mobile, placed in the card's right action column on desktop and below the price on mobile):

- **Apply** — green (`bg-medical-green text-white`), opens the contact form in a Dialog popup. No navigation.
- **View Clinic** — blue (`bg-primary text-white`), links to `/clinic/:id?treatment=...` (existing behavior).

Implementation:
- Add a local `applyOpenForClinicId` state in `ClinicListing.tsx`.
- Render a single `<Dialog open={applyOpenForClinicId === clinic.id}>` per card containing `<ContactClinicForm clinicId={clinic.id} initialTreatment={selectedTreatmentName} onSuccess={() => setApplyOpenForClinicId(null)} />`.
- Apply button calls `setApplyOpenForClinicId(clinic.id)`.

## 3. Treatment context next to price

Currently shows:
```
Starting
€6000
```
Change to:
```
Starting from · All-on-6 Dental Implants
€6000
```
- Use `selectedTreatmentName` when a specific treatment filter is active.
- When no treatment filter (showing min price across treatments), show "Starting from · Lowest treatment price" (or omit the suffix).
- Small muted text (`text-[11px] text-muted-foreground`), single line, truncated on narrow widths.

## 4. Card visual redesign (desktop + mobile)

Goals: modern, consistent, scannable, same component shape for both breakpoints.

### Desktop (`lg:` and up)
```text
+----------------------------------------------------------+
| [Image  ] | Clinic Name              ★ 4.8 Google Rating |
| 240x180  | 📍 Antalya, Turkey   ✓ Verified              |
| carousel | 🇬🇧 English  🇩🇪 German  🇷🇴 Romanian  +1     |
| Featured | 🏨 Hotel  ✈ Transfer  🗺 Tours  +2          |
| badge    |                                               |
|          | [All-on-4 €5000] [All-on-6 €6000] +3         |
|          |---------------------------------------------- |
|          | Starting from · All-on-6        [ Apply  ]   |
|          | €6000                            [View Clinic]|
+----------------------------------------------------------+
```
- Card height auto (no fixed `h-48`), generous padding (`p-5`).
- Image left column fixed width (`w-60`), rounded only on the left (`rounded-l-2xl`), full image height.
- Right column is a flex column: header → meta rows → treatments → footer (price + buttons).
- Buttons stacked vertically on the right of the footer (`w-36`, `h-10` each, `gap-2`).
- Remove the absolute-positioned price block and the animated right rail.

### Mobile
```text
+--------------------------+
| [   Image carousel    ] |
| Featured       ✓Verified|
| 📍 Antalya, Turkey      |
+--------------------------+
| Clinic Name   ★4.8 Google|
| 🇬🇧 🇩🇪 🇷🇴             |
| 🏨 ✈ 🗺 +2              |
| [All-on-4][All-on-6] +1 |
|--------------------------|
| Starting from · All-on-6|
| €6000                   |
| [        Apply        ] |
| [     View Clinic     ] |
+--------------------------+
```
- Buttons full-width, stacked, Apply on top.
- Same green/blue color tokens as desktop for consistency.
- Slightly tighter rounded radius (`rounded-2xl`), softer shadow, no `hover:scale` on mobile.

### Shared visual tweaks
- Remove `lg:hover:scale-[1.02]` (replaced with subtle `hover:shadow-elegant` only).
- Featured badge moved to image overlay top-left for both layouts (already there on mobile; add to desktop overlay consistently).
- Use `medical-green` token (already in `tailwind.config.ts`) for Apply button so colors stay coordinated with the existing palette.

## Technical Details

**Files to edit:**
- `src/pages/ClinicListing.tsx` — replace lines ~462–718 with the new unified card. Add `Dialog` import + Apply state.
- `src/components/ui/google-rating.tsx` — shrink prominent variant, rename label to "Google Rating".
- `src/components/clinic-listing/ClinicCardSkeleton.tsx` — adjust skeleton to match new layout (image left + content right + two stacked buttons).

**No DB / RLS / route changes.** Reuses existing `ContactClinicForm`, `Dialog`, `ImageCarousel`, `getClinicPrice`, `selectedTreatmentName`.

**Mobile detection:** keep using Tailwind `lg:` breakpoint (matches existing pattern). One JSX block per breakpoint to keep desktop's image-left vs mobile's image-top layout, but they share button + price + meta sub-components inlined.
