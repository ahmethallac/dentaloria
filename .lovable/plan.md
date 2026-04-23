

# One Account = One Clinic (Delete Clinic → Delete User)

Right now `clinics` and `auth.users` are loosely linked. Deleting a clinic leaves the auth user, profile, and role behind. We're going to make the account and the clinic the same entity end-to-end.

## 1. Registration becomes clinic-first (single form)

Replace the current two-step flow ("sign up" → "add clinic from panel") with a single registration form at `/register-clinic` (and the existing `/auth` "Register" tab redirects there).

The form collects in one step:
- **Account**: email, password, confirm password
- **Clinic**: name, country, city, address, phone, website (optional), description
- **Documents**: tax certificate + health tourism authorization (uploaded to `clinic-documents` private bucket)
- Terms checkbox

Submit flow (atomic, server-side via new edge function `register-clinic`):
1. `supabase.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { user_type: 'clinic_admin', clinic_name } })`
2. Insert `clinics` row with `user_id = new auth user id`, `approval_status = 'pending'`, `is_published = false`
3. Insert `clinic_approvals` row with the uploaded document URLs
4. Insert `user_roles` row with role `clinic_admin`
5. If any step fails, roll back by deleting the auth user (so we never leave orphans)
6. Send the existing approval-request email to admins

The user is NOT auto-signed-in. They see a "Pending approval" confirmation screen and can only sign in once a Super Admin approves.

## 2. Block sign-in until approved

Add a check in `AuthContext` after sign-in: if the user has role `clinic_admin` and their clinic's `approval_status !== 'approved'`, immediately sign them out and show "Your clinic registration is awaiting Super Admin approval."

## 3. Delete clinic = delete account (zero trace)

Update `supabase/functions/admin-delete-clinics/index.ts` so permanent deletion also wipes the owner account:

After the existing cascade delete of the clinic row, for each clinic's `user_id`:
- Delete from `user_roles` (the `clinic_admin` row)
- Delete from `profiles`
- `supabase.auth.admin.deleteUser(user_id)` — removes them from `auth.users` (this is what's currently missing — that's why your screenshot still shows them)

Safety guard: never delete a `user_id` that has the `admin` role (in case a Super Admin somehow owns a clinic).

The existing trash flow stays the same — only **permanent delete** removes the auth user. Move-to-trash leaves the account intact so it can be restored.

## 4. Remove the now-obsolete "Add Clinic from panel" path

- Remove/redirect `/add-clinic` (creating a clinic post-signup is no longer a thing).
- Remove the "Add your clinic" CTA from `Dashboard` for clinic_admins (they already have one from registration).
- Keep `ClinicPanel` for managing the existing clinic (info, doctors, treatments, images, patients).

## 5. One-time cleanup of existing orphan auth users

Extend the existing `admin-wipe-data` edge function with an `orphans-only` mode (or run a one-off SQL + admin API call) that:
- Finds every `auth.users` row whose `id` is NOT in `user_roles` with role `admin` AND NOT referenced by any non-trashed `clinics.user_id`.
- Deletes those auth users + their `profiles` + `user_roles` rows.

Run it once after this change ships to clear the leftovers shown in your screenshot.

## Acceptance

- New clinic registration is a single form; no separate "create clinic" step exists.
- A pending clinic cannot sign in until approved.
- Permanently deleting a clinic in the admin panel also removes the corresponding row from Supabase → Authentication → Users, plus its `profiles` and `user_roles` rows.
- The orphan auth users currently visible in your screenshot are gone after the one-time cleanup runs.
- Super Admin accounts are never touched.

## Files touched

- **New**: `supabase/functions/register-clinic/index.ts`, `src/pages/RegisterClinic.tsx`
- **Edited**: `supabase/functions/admin-delete-clinics/index.ts` (add auth user deletion), `supabase/functions/admin-wipe-data/index.ts` (orphan mode), `src/contexts/AuthContext.tsx` (pending-approval gate), `src/pages/Auth.tsx` (redirect Register tab), `src/App.tsx` (route), `src/pages/Dashboard.tsx` and `src/pages/AddClinic.tsx` (remove obsolete add-clinic CTA/page)

