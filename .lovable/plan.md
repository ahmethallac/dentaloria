## Goal

Add an admin-controlled "Homepage Showcase" feature so only manually-flagged clinics appear in a new Featured Clinics section on the homepage (2 rows × 4 clinics, no pricing).

## 1. Database

Add a new column to drive sponsored placement, separate from the existing `is_featured` flag (which is used elsewhere for ordering/badges).

```sql
ALTER TABLE public.clinics
  ADD COLUMN homepage_showcase boolean NOT NULL DEFAULT false;

ALTER TABLE public.clinics_public
  ADD COLUMN homepage_showcase boolean NOT NULL DEFAULT false;
```

Update `sync_clinics_public()` to copy `homepage_showcase` into `clinics_public` so the public/anon read path can filter on it without exposing the private `clinics` table.

No new RLS needed — admins already have full update access on `clinics`.

## 2. Backend service

In `src/lib/services.ts`, add a new function (and keep `getFeaturedClinics` untouched for any other callers):

```ts
export const getHomepageShowcaseClinics = async (limit = 8) => {
  // query clinics_public where homepage_showcase = true
  // join cities/countries, clinic_images, clinic_treatments, languages
  // order by created_at desc, limit 8
};
```

Returned shape matches what `mapClinicForCard` expects, plus `languages` and treatment names so the card can render the same chips as the listing page.

## 3. Homepage section (`src/pages/Index.tsx`)

Replace the data source of the existing "Popular Clinics" carousel area with a new "Featured Clinics" section:

- Title: "Featured Clinics"
- Layout: CSS grid, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, exactly **2 rows × 4 = up to 8 clinics**. Limit query to 8.
- Card: reuse the same visual the listing page uses (Google rating, languages, services/specialties, Quick Apply + View Clinic buttons). **No price block.**
- Hide the whole section when there are 0 showcase clinics (don't show empty state to public).
- Mobile: stack to 1–2 columns, still capped at 8.

Implementation detail: extract the listing-page card markup (lines ~470–610 in `ClinicListing.tsx`) into a shared `<ClinicListingCard>` component with a `showPrice` prop, and use it in both places. This avoids drift and matches the user's "same information" requirement.

## 4. Admin panel — "Sponsored" controls

In the Super Admin clinic management area (`src/pages/Admin.tsx` and the per-clinic management view in `src/pages/ClinicPanel.tsx` admin tabs):

- Add a new **Sponsored** tab/section in the Manage Clinic view, alongside Overview / Patients / Clinic Info / Admin Settings.
- Inside Sponsored, render a single toggle row for now:
  - Label: **Homepage Showcase**
  - Description: "Feature this clinic in the Homepage Showcase section."
  - `Switch` bound to `clinics.homepage_showcase`, saves immediately via `supabase.from('clinics').update({ homepage_showcase }).eq('id', clinicId)`.
- Leave room for additional sponsored placements later (the section is a list; only one item now).

Also in the clinics list table (`Admin.tsx`):
- Add a small "Showcase" badge next to the Active/Inactive badge when `homepage_showcase = true`, so admins can see at a glance which clinics are showcased.

## 5. Out of scope (per user)

- No pricing, billing, or Stripe wiring.
- No clinic-owner-facing UI; this is admin-only.
- Other sponsored placements (sidebar, search top, etc.) — schema leaves room but UI only ships Homepage Showcase.

## Files touched

- `supabase/migrations/...` (new column + sync function update)
- `src/lib/services.ts` (new `getHomepageShowcaseClinics`)
- `src/pages/Index.tsx` (new Featured Clinics grid)
- `src/components/ClinicListingCard.tsx` (new, extracted from listing)
- `src/pages/ClinicListing.tsx` (use shared card)
- `src/pages/Admin.tsx` (Sponsored tab + showcase badge in list)
