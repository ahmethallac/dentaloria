I found the likely cause of the remaining bug and here is the exact fix plan.

## What I will fix

Update the admin “Review Page” flow so the preview page can reliably load a clinic that is pending page approval instead of falling through to “Clinic not found”.

## Why it is still happening

The current flow opens:
- `/clinic/{id}?preview=1`

`ClinicDetail.tsx` only uses the private query when both are true:
- `preview=1` is present
- the current session already has `userRole === 'admin' || 'sub_admin'`

That role value is loaded asynchronously in `AuthContext`. If the clinic detail page renders before the role finishes loading, `isPreview` is false on the first pass and the page can query the public `clinics_public` source instead. Because pending clinics are not live yet, that public query returns nothing, which produces “Clinic not found”.

## Implementation plan

1. Make preview-mode gating in `ClinicDetail.tsx` wait for auth/role initialization before deciding whether to use the public or private clinic query.
2. Prevent the page from showing a not-found state while auth is still loading and preview access has not been resolved yet.
3. Keep the existing security rule intact: only admins/sub-admins can view preview mode; non-admins with `?preview=1` should still be blocked from private access.
4. Verify the Admin “Review Page” button continues to use the preview URL and matches the fixed loading behavior.

## Files to update

- `src/pages/ClinicDetail.tsx`

## Technical details

Planned logic adjustment:

```text
If ?preview=1:
  wait until AuthContext loading === false
  if userRole is admin/sub_admin -> use getClinicByIdPrivate(id)
  else -> return not found / fallback safely
Else:
  use getClinicById(id)
```

This is a front-end timing fix only. No database migration should be needed.

## Expected result

From the Super Admin panel, clicking “Review Page” should open the pending clinic preview instead of showing “Clinic not found”.