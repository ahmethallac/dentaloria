

# Admin Clinics: Filters + Bulk Trash + Permanent Delete

The trash schema and basic bulk actions already exist from the previous round. This pass adds **country/city filters**, fixes anything missing in the bulk flow, and guarantees that "Delete Permanently" wipes every trace from the database and storage.

## 1. Filter bar above the clinics table

Add to the **Clinics** section in `src/pages/Admin.tsx` (both Active and Trash tabs):

- **Search** input — matches clinic name (case-insensitive).
- **Country** select — populated from `countries` table.
- **City** select — populated from `cities` table, filtered by selected country. Disabled until a country is chosen.
- **Approval status** select — All / Pending / Approved / Rejected.
- **Clear filters** button.

Filters apply client-side on top of the already-fetched list, or are pushed into the Supabase query for large lists. Counts on the Active/Trash tab badges reflect the unfiltered totals.

## 2. Selection + bulk actions (verify and complete)

Active tab:
- Header checkbox = select-all (respects current filter — only selects visible rows).
- Per-row checkbox.
- Floating action bar appears when ≥1 selected: **Move to Trash (N)** + selection count + Clear selection.
- Per-row trash icon for single moves.

Trash tab:
- Same selection model.
- Bulk actions: **Restore (N)** and **Delete Permanently (N)**.
- **Empty Trash** button (top-right of Trash tab) — confirms then permanently deletes every trashed clinic.
- Per-row Restore + Delete Permanently icons.

All destructive actions go through an `AlertDialog` with explicit copy: *"Permanently delete N clinics? This removes all images, doctors, treatments, leads, and documents. This cannot be undone."*

## 3. Permanent deletion = zero trace

Today, a `DELETE FROM clinics` removes the row and (via the `ON DELETE CASCADE` FKs added previously) clears `clinic_images`, `clinic_treatments`, `doctors`, `clinic_approvals`, `clinic_billing_settings`, `contact_requests`, `lead_purchases`, and `clinics_public`. What's missing: the **storage files** (clinic photos, doctor photos, tax/health-tourism docs).

New edge function: **`admin-delete-clinics`** (service-role).

Input: `{ clinicIds: string[] }`. Auth: requires Super Admin JWT.

Steps per clinic:
1. Read `clinic_images.image_url`, `doctors.image_url` / `profile_image_url`, and `clinic_approvals.tax_certificate_url` / `health_tourism_doc_url`.
2. Parse storage paths from those URLs and call `storage.from(bucket).remove([paths])` for `clinic-images`, `doctor-images`, `clinic-documents`.
3. `DELETE FROM clinics WHERE id = ANY($1)` — cascades clean every related row.
4. Return a report: `{ deletedClinics, deletedImages, deletedDocs, errors[] }`.

Frontend calls this function for both "Delete Permanently" (single + bulk) and "Empty Trash". After success, refetch the trash list and show a toast with the report counts.

## 4. Public site safety

Already handled by the previous migration (`sync_clinics_public` skips trashed rows). No further DB work needed; trashed clinics are invisible to visitors the moment they're trashed and gone forever after permanent delete.

## Acceptance

- Admin → Clinics shows search + country + city + status filters that narrow both Active and Trash lists.
- Select-all and per-row checkboxes work; bulk Move to Trash, Restore, Delete Permanently, and Empty Trash all function.
- A permanently deleted clinic disappears from: Supabase tables (`clinics`, `clinics_public`, all related), storage buckets (no orphaned images/docs), the public listing, and the admin panel.
- Confirmation dialog appears before any permanent deletion.

