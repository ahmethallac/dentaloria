
# Performance Optimization Plan: Instant Clinic Search Results

## Problem Analysis

The current clinic listing page has a noticeable ~1 second delay when loading results due to several factors:

1. **Multiple Sequential Database Queries**: The `getClinics()` function makes 5 separate Supabase queries:
   - Main clinics query
   - Cities with countries
   - Clinic images
   - Clinic treatments
   - Doctors

2. **No Caching**: Despite having `@tanstack/react-query` installed and configured, it's not being used. Every filter change triggers fresh network requests.

3. **Full Loading State**: The UI shows a blank spinner while loading, giving no visual indication of content structure.

---

## Solution Strategy

### 1. Implement React Query for Caching (Primary Improvement)

Migrate from manual `useEffect` fetching to `useQuery` hooks:

```text
Current Flow:
User changes filter -> setLoading(true) -> fetch data -> setLoading(false) -> render

New Flow:
User changes filter -> show cached data immediately -> background fetch -> update when ready
```

**Benefits**:
- Previously fetched results display instantly from cache
- Background refetching keeps data fresh
- Automatic retry on failure
- Deduplication of concurrent requests

**Configuration**:
```
staleTime: 5 minutes (use cached data without refetching)
gcTime: 30 minutes (keep in memory for fast retrieval)
```

---

### 2. Add Skeleton Loading UI (Perceived Performance)

Replace the blank spinner with skeleton cards that show the layout structure:

```text
+------------------+
| [=====]          |  <- Image skeleton
|                  |
| [====]  [==]     |  <- Title, rating
| [=======]        |  <- Location
| [==] [===] [==]  |  <- Treatment tags
|        [Button]  |  <- View button area
+------------------+
```

This gives users immediate visual feedback that content is loading.

---

### 3. Optimize Database Queries (Backend Performance)

Reduce network round-trips by parallelizing queries:

**Before**: 5 sequential database calls

**After**: 
- Main clinic query runs first
- Then 4 related data queries run in parallel using `Promise.all()`

This alone can cut load time by 40-60%.

---

## Implementation Details

### Phase 1: Create Skeleton Loading Component

Create a new component `ClinicCardSkeleton` that mirrors the clinic card layout with animated placeholders.

**File**: `src/components/clinic-listing/ClinicCardSkeleton.tsx`

---

### Phase 2: Create Custom Hook with React Query

Create `useClinicSearch` hook that encapsulates:
- Query key based on filters
- Caching configuration
- Data transformation (adding default images)

**File**: `src/hooks/useClinicSearch.ts`

```text
Key structure: ['clinics', { treatment, country, city, page }]

Options:
- staleTime: 300000 (5 minutes)
- gcTime: 1800000 (30 minutes)
- keepPreviousData: true (show old results while new ones load)
```

---

### Phase 3: Optimize getClinics Service

Modify `src/lib/services.ts` to parallelize the related data fetches:

```text
Before (Sequential):
1. Fetch clinics        ~200ms
2. Fetch cities         ~150ms
3. Fetch images         ~150ms
4. Fetch treatments     ~200ms
5. Fetch doctors        ~150ms
Total: ~850ms

After (Parallel):
1. Fetch clinics        ~200ms
2-5. Fetch all related  ~200ms (parallel)
Total: ~400ms
```

---

### Phase 4: Update ClinicListing Page

Refactor `src/pages/ClinicListing.tsx`:

1. Replace `useState` for clinics with `useClinicSearch` hook
2. Use `isFetching` vs `isLoading` to show skeletons only on initial load
3. Keep previous data visible while new results load
4. Show skeleton cards instead of spinner

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/clinic-listing/ClinicCardSkeleton.tsx` | Create | Skeleton loading UI |
| `src/hooks/useClinicSearch.ts` | Create | React Query hook for clinic search |
| `src/lib/services.ts` | Modify | Parallelize database queries |
| `src/pages/ClinicListing.tsx` | Modify | Use new hook and skeleton UI |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Initial page load | ~1s blank spinner | ~0.4s with skeleton |
| Filter change (cached) | ~1s blank spinner | **Instant** (from cache) |
| Filter change (new) | ~1s blank spinner | Show previous + skeleton |
| Perceived performance | Poor | Excellent |

---

## Technical Notes

- React Query is already installed and configured in `App.tsx`
- The existing `Skeleton` component from `src/components/ui/skeleton.tsx` will be used
- The `keepPreviousData` option ensures smooth transitions between filter states
- Mobile and desktop layouts will both get skeleton versions
