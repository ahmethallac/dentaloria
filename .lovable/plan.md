# Replace rating system with Google rating

Replace the existing rating system entirely with a self-reported "Google rating" managed by clinics. Keep all other features (balance system, sorts, filters) untouched.

## What changes for the user

**Clinic profile editor (Clinic Panel → Info tab)**
- New field: **Google Rating** as a dropdown with values 3.0, 3.1, 3.2, … 4.9, 5.0.
- Warning text below the field: *"This rating must match your actual rating on Google Maps. Entering an inaccurate rating may result in your listing being removed."*
- The old "Trustpilot URL" field is removed.

**Clinic card (listing page) and clinic detail page**
- Show a star icon followed by the Google rating number (e.g. ★ 4.7).
- Hover/click reveals a tooltip: *"Ratings reflect the clinic's actual Google rating."*
- Review count badges (the `(123)` numbers) are removed everywhere they appear.
- Star fill row on the detail page is removed (kept it minimal: one star + number + tooltip).

**Sort dropdown on the listing page**
- Add **"Highest Rated"** option. Sorts by Google rating descending; ties broken by clinic balance descending (higher balance first).
- Remove **"By Experience"** option.
- All existing sort options (Balance, Price low/high, etc.) stay exactly as-is.
- The existing manual-override-vs-balance behavior is preserved.

## Technical details

**Database (no schema change needed)**
- Reuse the existing `clinics.rating` numeric column as the Google rating. This avoids a migration and reuses the column already mirrored in `clinics_public` and the `sync_clinics_public` trigger.
- `clinics.review_count` and `clinics.trustpilot_url` / `clinics.trustpilot_rating` columns remain in the DB but are no longer read or written by the app (left intact to avoid touching the trigger and to preserve existing data).

**Frontend**

`src/components/clinic-panel/ClinicInfoTab.tsx`
- Remove the Trustpilot URL input.
- Add a `Select` (shadcn) bound to `form.rating`, options generated from `3.0` to `5.0` step `0.1` (21 values, formatted to one decimal).
- Warning paragraph rendered under the Select with `text-xs text-muted-foreground` (warning tone).
- Include `rating: parseFloat(form.rating)` in the `updateClinic` payload.

`src/components/ui/clinic-card.tsx`
- Replace existing rating block with a single `<Tooltip>` wrapping `★ {rating.toFixed(1)}`. Tooltip content: *"Ratings reflect the clinic's actual Google rating."*
- Remove the `(review_count)` text and the `experience` chip's review-related siblings (experience itself stays — only the rating UI changes).

`src/pages/ClinicListing.tsx`
- Remove `(review_count)` next to ratings in both card layouts.
- Wrap the star+number in a tooltip with the Google rating message.
- Sort dropdown: add `<SelectItem value="rating">Highest Rated</SelectItem>`, remove the `experience` item. Keep the existing label "By Rating" replaced with "Highest Rated".

`src/pages/ClinicDetail.tsx`
- Replace the 5-star row + number with: `★ {clinic.rating.toFixed(1)}` inside a tooltip. Remove the `reviewCount` display.

`src/hooks/useClinicSearch.ts` and `src/lib/services.ts`
- Sort type: drop `'experience'`, keep `'rating'`.
- For `sortBy === 'rating'`: order by `rating DESC, balance_cents DESC` against `clinics_public` (both columns already exist there). This satisfies the rating-then-balance tie-break requirement.
- All other sort branches and the balance-default behavior remain unchanged.

`src/pages/AddClinic.tsx`
- Remove the Trustpilot URL input from the registration form (it would otherwise contradict the panel change). The field stays in the DB but is no longer collected.

**Out of scope (explicitly unchanged)**
- Balance system, top-up flow, lead purchase flow, discount codes.
- Default sort (balance-based) and the manual-override-vs-balance behavior.
- All filters and search logic.
- Reviews table and review submission UI (untouched; just not surfaced as a count next to the rating).
