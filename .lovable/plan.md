## Goal

Redesign the homepage Featured Clinics cards to a minimal, premium layout with only: image, Google rating badge, name, city+country, and a single "Get Price" button.

## Changes — `src/components/home/FeaturedClinicsSection.tsx`

### Card contents (in order)

1. **Image** — `aspect-[4/3]`, `object-cover`, rounded top corners.
2. **Google rating badge** — floating in top-right corner of the image. Small white pill with star icon + numeric rating (e.g. `★ 4.8`). Only rendered when `clinic.rating` exists.
3. **Clinic name** — `font-semibold`, `line-clamp-1`.
4. **City, Country** — small muted text, e.g. `Istanbul, Turkey`. Pulled from `clinic.cities.name` and `clinic.cities.countries.name`.
5. **"Get Price" button** — full-width primary button, links to `/clinic/{id}`.

### Remove

- Languages row
- MapPin icon (city shown as plain text now)
- Any facilities/treatments/badges
- Verified/Featured overlays
- Card-level `<Link>` wrapper (the button is the sole CTA; card itself is not clickable, keeps focus on the button)

### Rating badge visual

- Position: `absolute top-2 right-2`
- Style: `bg-white/95 backdrop-blur px-2 py-1 rounded-full shadow-sm text-xs font-semibold flex items-center gap-1`
- Icon: `Star` from lucide, filled amber.

### Responsive grid

Already `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` — confirm md breakpoint for tablets (currently jumps 2 → 4). Update to include `md:grid-cols-3`.

### Data source

No new fields — uses existing `rating`, `cities.name`, `cities.countries.name` already returned by `getHomepageShowcaseClinics`.

## Files touched

- `src/components/home/FeaturedClinicsSection.tsx` (rewrite `ShowcaseCard` + grid classes)

No backend, service, schema, or other component changes.  
  
**The images should be swipeable on both mobile and desktop.** Users should be able to **swipe with their finger on mobile** and **drag with the mouse on desktop** to browse through the clinic images.