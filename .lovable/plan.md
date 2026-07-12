## Plan

Implement and verify these 5 fixes. Each item will be tested with real data / screenshots / network checks before marking done.

---

### 1. City-match the post-submit clinic recommendations

**File:** `supabase/functions/recommend-clinics/index.ts`

- Look up `city_id` of `excludeClinicId` from `clinics_public`.
- First candidate pool: `balance_cents > 0`, same `city_id`, excluding the submitted clinic. Random-pick up to 3.
- If same-city pool has fewer than 3, fill remaining slots from global `balance_cents > 0` clinics (excluding already-picked + submitted clinic).
- Return up to 3 clinics with primary image.
- Deploy the updated edge function.

---

### 2. Fix the empty recommendations popup

**Files:** `supabase/functions/recommend-clinics/index.ts`, `src/components/forms/PostFormRecommendationsDialog.tsx`

- Add explicit error surfacing in the dialog: if the edge function returns an error or non-2xx status, show a toast and log to console instead of silently showing "No clinics available".
- Ensure the dialog correctly passes `excludeClinicId` and handles missing/empty responses.
- After the city-match change in #1, verify with a real form submission that the popup now shows real clinics.
- Test fallback path (small city with <3 clinics) so it still fills slots globally.

---

### 3. Speed up clinic images on homepage cards

**Files:** `src/components/home/FeaturedClinicsSection.tsx`, `src/pages/Index.tsx`, helper in `src/lib/imageUtils.ts`

- Add a helper that appends Supabase Storage image-transformation params (`?width=600&quality=80`) to Supabase-hosted clinic image URLs; leave non-Supabase URLs unchanged.
- Use the optimized URL in `ShowcaseCard` carousel images.
- Keep `aspect-[4/3]` container and show a skeleton/placeholder until `onLoad` fires.
- Set `loading="eager"` on images in the first 2 cards (covers first visible row on mobile and desktop); use `loading="lazy"` for the rest.

---

### 4. International phone input with auto-detected country

**File:** `src/components/forms/ContactClinicForm.tsx`

- Install `react-phone-number-input` (+ `libphonenumber-js` if needed as peer).
- Replace the plain `<Input type="tel">` with a styled `PhoneInput` that shows flag + dial code and lets the user change country.
- Integrate with `react-hook-form` via `Controller`.
- Update the Zod schema to validate the value as E.164 using `libphonenumber-js` `isValidPhoneNumber`.
- On mount, call a free IP geolocation service (`https://ipwho.is/`) to detect the visitor's country code and pre-select it; fallback to a sensible default if the lookup fails.

---

### 5. Persist patient's contact info across clinics

**File:** `src/components/forms/ContactClinicForm.tsx`

- After a successful submission, save `name`, `email`, and `phone` to `localStorage` under key `dentaloria_patient_contact`.
- On form mount, read that key and pre-fill the same 3 fields (treatment and message stay blank/clinic-specific).
- This applies to the clinic detail page contact form, the mobile "Get Quote" dialog, and the Quick Apply flow inside `PostFormRecommendationsDialog`.

---

## Verification steps

1. Submit a contact form on a real clinic page → confirm network call to `recommend-clinics` succeeds and the popup lists real clinics from the same city.
2. Check the homepage "Popular Clinics" / "Featured Clinics" sections: inspect image network requests to confirm `width=600` transformation params, confirm first-row images load eagerly, and take screenshots showing no layout shift.
3. Open the contact form on a clinic page: confirm the phone input shows a flag and dial code, and that the country matches the detected location.
4. Submit the form, then open a different clinic's contact form: confirm name/email/phone are pre-filled from localStorage.

---

## Files touched

- `supabase/functions/recommend-clinics/index.ts`
- `src/components/forms/PostFormRecommendationsDialog.tsx`
- `src/components/forms/ContactClinicForm.tsx`
- `src/components/home/FeaturedClinicsSection.tsx`
- `src/pages/Index.tsx`
- `src/lib/imageUtils.ts` (new or updated helper)
- `package.json` / lockfile (for `react-phone-number-input`)

No database schema changes are required for these fixes.

&nbsp;

İşte İngilizce olarak, direkt yapıştırabileceğin şekilde:

---

## Addendum — review notes before implementing

**Item 3 (image speed) — fix required, not just query params:** Appending `?width=600&quality=80` directly to a normal Supabase Storage public URL (`/storage/v1/object/public/...`) does nothing — that endpoint ignores those params and always serves the original file. To actually get a resized image, use the Storage SDK's transform option instead:

```js
supabase.storage.from(bucket).getPublicUrl(path, { transform: { width: 600, quality: 80 } })

```

This generates the correct `/storage/v1/render/image/public/...` URL. Also confirm the Supabase project's plan actually has Image Transformations enabled — some tiers don't include it. If it's not available, fall back to compressing/resizing images client-side at **upload** time in `ClinicImagesManager.tsx` instead (there's already similar compression logic in `ClinicDoctorsManager.tsx` to reuse as a reference). When verifying, check the actual downloaded file size in the network tab — don't just confirm the code compiles, since a no-op param would silently still serve the full-size original.

**Item 4 (phone input) — don't block form render on geolocation:** The IP geolocation call (`ipwho.is`) should not delay the form from rendering. Show the form immediately with a sensible default country, then update the selected country silently once the geolocation lookup resolves (or fails).

**Item 5 (persisted contact info) — confirm scope:** Verify whether the "mobile Get Quote dialog" is actually rendering the same `ContactClinicForm` component or a separate one. If it's a separate component, the localStorage read/prefill logic needs to be added there too, not just in `ContactClinicForm.tsx`.

&nbsp;

&nbsp;

&nbsp;