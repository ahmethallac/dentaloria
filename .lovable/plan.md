# Fix: Clinics not showing in Super Admin panel

## Root cause

`src/pages/Admin.tsx` (line 82) loads clinics with this query:

```ts
supabase.from('clinics').select(
  '*, clinic_approvals(*), clinic_billing_settings(*), cities(...)'
)
```

The `clinic_billing_settings` table was dropped in migration `20260425232124_…` (the platform moved to a flat €25/lead prepaid balance model). Because PostgREST can't resolve that embedded relation, the entire query fails and `clinicsRes.data` is empty — so the Clinics section, the dashboard count, and the recent-clinics widget all show nothing.

This also breaks the rest of `loadAllData` for any consumer of `clinics` state.

## Fix

1. **`src/pages/Admin.tsx` (line 82)** — remove `clinic_billing_settings(*)` from the select string:
   ```ts
   supabase.from('clinics').select(
     '*, clinic_approvals(*), cities(id, name, country_id, countries(id, name))'
   ).order('created_at', { ascending: false })
   ```

2. **`supabase/functions/admin-wipe-data/index.ts`** and **`supabase/functions/admin-delete-clinics/index.ts`** — remove the `clinic_billing_settings` entries from their delete lists so wipe/delete don't error against the missing table.

3. Verify nothing else in `src/pages/Admin.tsx` reads a `clinic_billing_settings` field off the clinic rows (search shows the only frontend reference is this select — the UI already uses the fixed €25/lead messaging).

## Verification

- Reload `/admin` → Clinics section lists the registered clinic.
- Dashboard "Total Clinics" stat reflects the real count.
- Recent clinics widget on the overview populates.
