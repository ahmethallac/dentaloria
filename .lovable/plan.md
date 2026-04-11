

# Data Consistency Audit: ID-Based Filtering Migration

## Current State: Almost Fully Migrated

The migration to UUID-based filtering is **95% complete**. The core search flow (homepage → listing page → database query) now correctly uses UUIDs throughout. Here is the audit result:

### What's Correct

| Area | Status |
|------|--------|
| Homepage search bar (treatment select) | Uses `treatment.id` (UUID) |
| Homepage search bar (country select) | Uses `country.id` (UUID) |
| Homepage popular city cards | Passes `city.id` + `city.country_id` (UUIDs) |
| Homepage popular treatment cards | Passes `treatment.id` (UUID) |
| ClinicListing URL param sync | Reads UUIDs directly from params |
| ClinicListing → `useClinicSearch` | Passes UUIDs, validates with `isUUID()` |
| `getClinics()` in services.ts | Filters by UUID on `city_id`, `country_id`, `treatment_id` |
| `clinics_public` query | Uses UUID joins |
| Clinic registration (`AddClinic.tsx`) | Stores `city_id`, `treatment_id` as UUIDs |
| Popular cities metadata | String-matches city names for images only, navigates with UUID |

### Remaining Inconsistencies Found

#### 1. Footer Treatment Links — Still Using Names (BUG)
**File**: `src/components/ui/footer.tsx`, line 85
```
href={`/clinic-listing?treatment=${encodeURIComponent(t.name)}`}
```
The footer passes treatment **names** (e.g., "Dental Implants") instead of UUIDs. Since `ClinicListing` now expects UUIDs and the name-to-ID resolution logic has been removed, clicking these links will **silently fail** — the `isUUID()` check in `useClinicSearch` will reject the string, and no filtering will happen.

**Fix**: Change `t.name` to `t.id`.

#### 2. Clinic Detail Treatment Param — Name String (ACCEPTABLE)
**File**: `src/pages/ClinicListing.tsx`, lines 513, 605
```
to={`/clinic/${clinic.id}?treatment=${encodeURIComponent(selectedTreatmentName)}`}
```
This passes the treatment **name** to the clinic detail page for pre-filling the contact form. This is intentional — the contact form shows the treatment name as display text, not as a filter. **No fix needed.**

#### 3. `searchQuery` in `getClinics()` — Text Search (ACCEPTABLE)
**File**: `src/lib/services.ts`, line 226-228

A `searchQuery` parameter exists that does `ilike` text matching on clinic name/description. This is not currently used by any frontend component (no search input on the listing page), so it's dormant. If a text search feature is added later, it should be clearly separated from the UUID-based structured filters. **No fix needed now**, but worth noting.

#### 4. `POPULAR_CITIES_META` String Matching (LOW RISK)
**File**: `src/pages/Index.tsx`, line 119
```
.filter((c: any) => POPULAR_CITIES_META[c.name])
```
This matches city names from the DB against hardcoded keys (`"Istanbul"`, `"Antalya"`, `"Izmir"`) to attach images. If a city is renamed in the DB (e.g., `"İstanbul"`), the card won't show. However, this only affects the UI display of popular cities — navigation still uses UUIDs. **Low risk**, but could be made more resilient by matching on city ID instead of name.

---

## Risk Analysis

| Risk | Severity | Impact |
|------|----------|--------|
| Footer treatment links broken | **HIGH** | Users clicking footer links get unfiltered results |
| Popular cities meta mismatch | LOW | City cards may not appear if DB names change |
| Dormant `searchQuery` text filter | NONE | Not used by any frontend component |
| Clinic detail treatment param | NONE | Intentional — display text, not a filter |

## Recommendations

### Must Fix (1 change)
1. **Footer**: Change `t.name` → `t.id` in footer treatment links

### Optional Improvements
2. **Popular cities meta**: Use city IDs as keys instead of names for resilience
3. **Remove dormant `searchQuery`**: If text search isn't planned, remove to avoid confusion

## Overall Assessment

Your architectural decisions are **sound and well-structured**:
- UUID-based filtering is the right approach — eliminates all casing, naming, and localization issues
- The database schema (treatments, cities, countries with UUID PKs) is clean
- The `clinics_public` view with trigger sync is a good pattern for public vs private data
- The `isUUID()` guard in `useClinicSearch` is a smart safety net

The only real bug is the footer link (1 line fix). Everything else is consistent and production-ready.

## Files to Change

| File | Change |
|------|--------|
| `src/components/ui/footer.tsx` | Line 85: `t.name` → `t.id` |
| *(Optional)* `src/pages/Index.tsx` | Use city IDs as keys for `POPULAR_CITIES_META` |

