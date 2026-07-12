## Plan

### 1. Edge function: `supabase/functions/recommend-clinics/index.ts`

- Accept a new `language` param (site locale code, e.g. `en`, `tr`) from the request body/query. Fall back to `en` if missing.
- Extend `clinics_public` select to include `rating`, `languages`, `city_id`.
- Join city name: fetch cities separately for the picked clinics (`cities.name` by `city_id`) and merge in.
- New candidate query builder that also applies `.contains("languages", [language])` when required.
- Tiered picking (each tier random-picks to fill up to 3 total; excludes already-picked and the submitted clinic):
  1. `city = target AND language required AND balance_cents > 0`
  2. `language required AND balance_cents > 0` (any city)
  3. Last-resort safety net: any published clinic (no language, no balance filter) — only used if the first two tiers together yield 0–2 clinics.
- Response shape per clinic:
  ```ts
  { id, name, image_url, rating, city, languages: string[] }
  ```
- Redeploy the edge function.

### 2. Dialog: `src/components/forms/PostFormRecommendationsDialog.tsx`

- Update `RecommendedClinic` type to include `rating`, `city`, `languages`.
- Pass the active site language into the invoke body: `language: useI18n().lang`.
- Widen the dialog: `sm:max-w-3xl` so 3 cards fit side by side.
- Replace the current list rendering with a responsive grid:
  - `grid grid-cols-1 sm:grid-cols-3 gap-4`
  - Each card:
    - Large image via `getClinicCardImageUrl(image_url)` in a `aspect-[4/3]` container with rounded top corners and skeleton fallback.
    - Clinic name (font-semibold, truncate 2 lines).
    - Row with star icon + `rating.toFixed(1)` (hidden if no rating) and city text.
    - Language badges (small pills, show up to 3 with `+N` overflow) using `getLanguage(code)` for flag + name.
    - Buttons row: `Visit` (outline, full width) and `Quick Apply` / `Sent` (primary, full width) stacked.
- Keep existing loading, error, and quick-apply behavior. Ensure image skeleton pattern mirrors `FeaturedClinicsSection`'s `ImageWithSkeleton`.

### 3. Verification

- Deploy the edge function, then via Playwright:
  - Set site language to `en`, submit a contact form on a clinic in a specific city; confirm the popup renders a 3-column grid with rating, city, language badges, and larger images, and that returned clinics include `en` in their languages and (where possible) match the same city.
  - Switch site language to `tr` and repeat; confirm returned clinics include `tr`.
  - Verify last-resort fallback by choosing a locale with limited coverage (still returns clinics, popup never empty).

### Files touched

- `supabase/functions/recommend-clinics/index.ts`
- `src/components/forms/PostFormRecommendationsDialog.tsx`

No DB schema changes.
