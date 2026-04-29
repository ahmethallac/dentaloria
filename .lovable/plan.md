# Clinic Languages, Facilities & Before/After Photos

Add three clinic-managed sections (Languages, Facilities & Amenities, Before & After photos), surface them on the listing and detail pages, replace the "Why Choose This Clinic" block, add a Languages filter, and make the Google rating more prominent.

## 1. Database (migration)

Add to `clinics` table:
- `languages text[] not null default '{}'` — stores codes like `en`, `de`, `pl`, `fr`, `nl`, `ro`, `ar`, `it`, `es`, `pt`, `ru`.
- `facilities text[] not null default '{}'` — stores keys: `airport_transfer`, `hotel_accommodation`, `patient_coordinator`, `city_tours`, `insurance`, `installment_plan`, `medication_supply`, `dietitian`, `local_sim`.

Add `clinics_public.languages` and `clinics_public.facilities` columns and update `sync_clinics_public()` trigger function to copy them whenever the public mirror is rebuilt.

New table `clinic_before_after_images`:
- `id uuid pk default gen_random_uuid()`
- `clinic_id uuid not null`
- `image_url text not null`
- `sort_order int not null default 0`
- `created_at timestamptz default now()`
- RLS: public SELECT; clinic owners + admins INSERT/UPDATE/DELETE (mirror existing `clinic_images` policies).

(No new storage bucket — reuse the existing public `clinic-images` bucket under a `before-after/` path prefix.)

## 2. Shared constants

New `src/lib/clinicMeta.ts` exporting:
- `LANGUAGES`: `[{ code, name, flag }]` — flag is the Unicode regional-indicator emoji (e.g. `🇬🇧`, `🇩🇪`). No image dependency.
- `FACILITIES`: `[{ key, label, icon }]` where `icon` is a lucide-react component (`Plane`, `Hotel`, `UserRound`, `Map`, `ShieldCheck`, `CreditCard`, `Pill`, `Salad`, `Smartphone`).
- Helpers: `getLanguage(code)`, `getFacility(key)`, `sortFacilitiesForCard(keys)` — pushes `hotel_accommodation` and `airport_transfer` to the front.

## 3. Clinic panel (`src/components/clinic-panel/ClinicInfoTab.tsx`)

Below the existing fields, add three new manager sections inside the Card:
- **Supported Languages**: multi-select chips (toggle buttons) showing flag + name. Saved with the existing "Update Information" button.
- **Facilities & Amenities**: same chip pattern, lucide icon + label.
- **Before & After Photos**: a new component `ClinicBeforeAfterManager` (mirroring `ClinicImagesManager`) — uploads to `clinic-images/before-after/<clinicId>/...`, lists thumbnails (landscape `aspect-video`), supports delete and reorder via simple up/down buttons. Inserts/deletes rows in `clinic_before_after_images`.

`updateClinic` in `src/lib/services.ts` already accepts arbitrary partials, so include `languages` and `facilities` in the payload.

## 4. Detail page (`src/pages/ClinicDetail.tsx`)

- Update `mapClinic` to expose `languages`, `facilities`, `beforeAfter` (array of urls).
- Update `getClinicById` / `getClinicByIdPrivate` to also fetch from `clinic_before_after_images` and read `languages` / `facilities` (private query reads `clinics`; public reads `clinics_public`).
- **TABS**: replace with `overview`, `treatments`, `doctors`, `facilities`, `languages`, `gallery` (Before & After). Remove `contact`.
- New section directly below "About the Clinic":
  - **Facilities & Amenities** card — compact grid (`grid-cols-2 md:grid-cols-3`), each cell = lucide icon + label.
  - **Supported Languages** card — flex-wrap chips of `flag + name`.
- Remove the existing "Why Choose This Clinic" block entirely.
- New **Before & After** section at the bottom of the left column: horizontal scroll carousel showing 3 landscape cards at a time (`basis-1/3`), with left/right arrow buttons, snap scrolling, hidden scrollbar. Hidden if no photos.
- Header rating: replace small `GoogleRating` line with a more prominent block — larger star, bold rating value, label "Google Business Rating" next to it.

## 5. Listing page (`src/pages/ClinicListing.tsx` + `useClinicSearch` + `services.ts`)

- `getClinics` now selects `languages` and `facilities` from `clinics_public` (already returned by `select('*')` once columns exist) — no query change needed beyond filter handling.
- Add `languages?: string[]` filter. When provided, append `query = query.overlaps('languages', languages)`.
- `useClinicSearch` accepts `languageCodes: string[]` and forwards it.
- `ClinicListing` adds `selectedLanguages` state, syncs to URL.
- `FilterContent`: new "Languages" section — list of the 11 languages with checkbox toggles (multi-select), each row shows flag emoji + name.
- Card rendering (both desktop and mobile rows): under the existing meta line add:
  - **Languages line** — single-line, `flex-nowrap overflow-hidden`. Render flags+names; measure overflow with a small util that slices to a fixed cap (e.g. 4 desktop / 2 mobile) and appends `+N` Badge.
  - **Facilities line** — same single-line rule, sorted via `sortFacilitiesForCard`, shows icon + short label, cap (e.g. 4 desktop / 2 mobile) with `+N`.
  - Use `truncate` + flex `min-w-0` on the row so nothing wraps to a second line.
- Replace the small inline rating with the prominent `GoogleRating` variant + "Google Business Rating" label.

## 6. Reusable rating display

Extend `src/components/ui/google-rating.tsx` with a `variant="prominent"` prop:
- Larger star (`w-5 h-5`), bold rating, and a `"Google Business Rating"` text label next to it.
- Default variant unchanged so existing call sites keep current look unless updated.
- Update `ClinicCard` rating badges on listing + detail header to use the prominent variant.

## 7. Wiring summary

```
ClinicInfoTab ─writes→ clinics.languages/facilities + clinic_before_after_images
                              │
              sync_clinics_public trigger
                              ▼
                     clinics_public.languages/facilities
                              │
        getClinics / getClinicById ──► useClinicSearch / ClinicDetail
                              ▼
                  ClinicListing cards & ClinicDetail sections
```

All three new fields live behind the same fetch paths the listing and detail pages already use, so any clinic edit shows up immediately after a refetch (React Query cache invalidates on key change; manual refresh covers the rest).

## Files touched

- New migration (table + columns + trigger update)
- New: `src/lib/clinicMeta.ts`, `src/components/clinic-panel/ClinicBeforeAfterManager.tsx`
- Edited: `src/components/clinic-panel/ClinicInfoTab.tsx`, `src/components/ui/google-rating.tsx`, `src/components/ui/clinic-card.tsx`, `src/pages/ClinicDetail.tsx`, `src/pages/ClinicListing.tsx`, `src/components/clinic-listing/FilterContent.tsx`, `src/components/clinic-listing/MobileFilterDrawer.tsx`, `src/hooks/useClinicSearch.ts`, `src/lib/services.ts`
