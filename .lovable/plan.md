## Goal

Redesign the homepage "Featured Clinics" section (`src/components/home/FeaturedClinicsSection.tsx`) with a cleaner, more modern card layout and a stricter responsive grid.

## Changes

### 1. Grid layout
- Mobile: **2 columns** (`grid-cols-2`)
- Desktop: **4 columns** (`lg:grid-cols-4`)
- Keep the 8-clinic cap (2 rows × 4).

### 2. Card content — strip down to essentials
Each card shows ONLY:
1. Clinic image (top, rounded)
2. Clinic name
3. City (with small `MapPin` icon)
4. Languages spoken (flags + names, max 3 with `+N` overflow)

Remove from the card:
- "Featured" badge overlay
- "Verified" badge overlay
- Google rating
- Facilities row
- Treatments/services chips
- Quick Apply button
- View Clinic button
- Country (keep just city for compactness)

### 3. Card interaction
- The whole card becomes a single `<Link to={`/clinic/${id}`}>` — clean hover lift, no CTAs.
- Remove the Quick Apply dialog + `ContactClinicForm` import (no longer needed on homepage).

### 4. Visual style (modern & clean)
- White card, soft border, subtle shadow, rounded-2xl.
- Image: `aspect-[4/3]`, `object-cover`, rounded top corners.
- Tight padding (`p-3` mobile, `p-4` desktop).
- Typography: name `font-semibold text-sm lg:text-base line-clamp-1`, city `text-xs text-muted-foreground`.
- Hover: gentle `translate-y` + shadow increase.

### 5. Section header
Keep "Featured Clinics" title but tighten spacing (`mb-8`). Keep the empty-state hide behavior.

## Files touched

- `src/components/home/FeaturedClinicsSection.tsx` — rewrite the `ShowcaseCard` and grid, remove dialog/apply logic.

No backend, service, or schema changes. `getHomepageShowcaseClinics` already returns everything needed.
