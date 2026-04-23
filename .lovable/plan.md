

# Wipe All Clinic & Non-Admin User Data

Reset the system to a clean state so real clinics can register from scratch. Keep only Super Admin accounts and reference data (countries, cities, treatments, treatment categories).

## What gets deleted

**Database rows (in dependency order):**
1. `lead_purchases` — all rows
2. `contact_requests` — all rows
3. `contact_request_tracking` — all rows
4. `rate_limits` — all rows
5. `clinic_approvals` — all rows
6. `clinic_billing_settings` — all rows
7. `clinic_treatments` — all rows
8. `clinic_images` — all rows
9. `doctors` — all rows
10. `reviews` — all rows
11. `clinics` — all rows (cascades will also clear `clinics_public` via the sync trigger)
12. `user_roles` — every row whose role is NOT `admin`
13. `profiles` — every row whose `id` is NOT in `user_roles` with role `admin`
14. `auth.users` — every user that is NOT a Super Admin (done via the existing `admin-update-user-role` edge function's `delete_user` action so we don't touch the `auth` schema directly)

**Storage buckets (orphaned files):**
- `clinic-images` — empty the bucket
- `doctor-images` — empty the bucket
- `clinic-documents` — empty the bucket

## What is preserved

- All Super Admin accounts (`ahmethallaccom@gmail.com` and any other `admin` role users) — auth user, profile, and role row.
- Reference tables: `countries`, `cities`, `treatments`, `treatment_categories`.
- All schema, RLS policies, triggers, functions, and edge functions — untouched.

## How it runs

Two steps in default mode:

1. **Data deletion via insert tool** — one SQL script runs all the `DELETE` statements above in dependency order, scoped so Super Admins survive. The `clinics` deletes cascade to anything we missed thanks to the FKs added in the previous trash migration.

2. **Auth user cleanup + storage wipe** — a one-off cleanup script that:
   - Lists all `auth.users`, filters out those with the `admin` role, and deletes the rest using the service role key.
   - Empties the three storage buckets.
   
   Run as a temporary edge function invocation (or directly via the Supabase admin API from a script), then discarded.

## Acceptance

- `/` and `/clinics` show zero clinics.
- Admin panel → Clinics tab (Active and Trash) is empty.
- Admin panel → All Patients is empty.
- Admin panel → Users still shows the Super Admin(s), nothing else.
- A new clinic registration from a fresh email works end-to-end (sign up → create clinic → pending approval → approve → appears publicly).

⚠️ This is destructive and irreversible. Once approved I will execute it immediately.

