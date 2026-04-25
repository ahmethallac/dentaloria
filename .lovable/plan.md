## What I found

I checked the actual data for the pending clinic you're reviewing (`DENTAL TURKEY CLINIC ...`):

- `approval_status = 'approved'`
- `page_status = 'pending_page_approval'`
- `is_published = true`
- City/country joins are intact
- Your account role is correctly resolved as `admin`

So the database side is healthy and the admin private query (`getClinicByIdPrivate`) **should** return this clinic.

## Why "Clinic not found" still appears

The current `ClinicDetail.tsx` decides which query to run based on `isPreview = previewRequested && (userRole === 'admin' | 'sub_admin')`. The guard waits for `authLoading` to be false, but there is still a subtle hole:

`AuthContext` fires `onAuthStateChange` with an `INITIAL_SESSION` event in the new tab. That handler does `setLoading(true)` and then a `setTimeout(..., 0)` to fetch the role. In that brief window `authLoading` can flip false → true → false again. Meanwhile, `getCurrentUser().then` may resolve and set `loading=false` with `userRole=null` for one render before the role fetch completes — so the effect runs once with `isPreview=false`, hits `clinics_public` (which excludes non-live clinics), gets `null`, and renders "Clinic not found". The success of the later private query never overwrites that, because of how the state was set on the failed pass — except in this code it actually would re-fire when `isPreview` flips. So in most cases it self-heals, but if the network round trip orders unluckily, the not-found state shows.

The other realistic cause: in some sessions the new tab opens before the auth session has rehydrated from localStorage at all, so `userRole` is still `null` when `authLoading` first reads `false`.

## Will this affect brand-new clinics registering from now on?

Yes — the same race exists for any clinic in `pending_page_approval` (which every new registration goes through). It is not specific to your old clinic. Old clinic data is fine; the bug is purely in the front-end gating logic for `?preview=1`.

## Recommended fix (front-end only, no DB changes)

1. **Strengthen the gate in `ClinicDetail.tsx`**
   - When `previewRequested` is true, do not fire any fetch until BOTH `authLoading === false` AND `userRole !== null`. If after auth resolves the role is still `null` or not admin/sub_admin, show a clear "Not authorized for preview" message instead of falling through to the public query.
   - Keep the loading spinner visible during this resolution so the not-found UI cannot flash.

2. **Make the private fetch the source of truth in preview mode**
   - In preview mode never call `getClinicById` (the public query). If the private call returns null, show "Clinic not found (preview)" — never fall back to the public query.

3. **Add a one-line diagnostic**
   - Log `[ClinicDetail] mode=preview role=<x> result=<found|null>` so if it ever happens again we can confirm in console which path ran.

4. **Belt-and-suspenders for the Admin button**
   - In `Admin.tsx`, before opening the new tab, ensure the URL is exactly `/clinic/{id}?preview=1` (it is) and add `target="_blank"` via an `<a>` so middle-click also works. Minor polish.

## Files to update

- `src/pages/ClinicDetail.tsx` — tighten preview gating, remove public-fallback in preview mode, add diagnostic log
- `src/pages/Admin.tsx` — minor link polish (optional)

## Expected result

- The "Clinic not found" flash disappears for both your existing clinic and any future clinic in `pending_page_approval`.
- If something still goes wrong, the console log will tell us exactly which branch ran so we can fix it definitively.

## Recommendation on your existing clinic

Keep it — no need to re-register. The bug is purely client-side rendering logic; the underlying clinic record is valid and will work as soon as the gating fix lands.
