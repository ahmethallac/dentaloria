

# Clinic Detail Page Redesign — Premium Desktop Experience

## Design Analysis

**Competitor (Flymedi)**: Clean 2-column layout, sticky quote sidebar with consultant photo, tab navigation (Details / Before-After / Reviews / Staff / Cost), accreditation badges, sticky bottom CTA bar with price.

**Current Dentaloria**: Generic card-based layout, everything stacked vertically on the left, plain "Contact Clinic" sidebar, no section navigation, no visual hierarchy differentiation between sections. Feels template-like.

## New Design Direction

### Layout Structure (Desktop)
```text
┌──────────────────────────────────────────────────────────┐
│ Navbar                                                    │
├──────────────────────────────────────────────────────────┤
│ Breadcrumb                                                │
├──────────────────────────────────────────────────────────┤
│ Clinic Name + Verified Badge + Location + Rating (inline) │
├──────────────────────────────────────────────────────────┤
│ [Tab Nav: Overview | Treatments | Doctors | Contact ]     │
├────────────────────────────────┬─────────────────────────┤
│                                │                         │
│  Hero Image Gallery            │  Sticky Sidebar         │
│  (main + thumbnails grid)      │  ┌───────────────────┐  │
│                                │  │ "Get a Free Quote"│  │
│  ─────────────────────────     │  │ Consultant avatar  │  │
│  About the Clinic              │  │ Trust bullets      │  │
│  (expandable description)      │  │ Contact Form       │  │
│                                │  │ Accreditation icons│  │
│  ─────────────────────────     │  └───────────────────┘  │
│  Quick Stats (glass cards)     │                         │
│  Experience | Patients | Specs │                         │
│                                │                         │
│  ─────────────────────────     │                         │
│  Treatment Prices              │                         │
│  (clean table with hover)      │                         │
│                                │                         │
│  ─────────────────────────     │                         │
│  Our Doctors                   │                         │
│  (horizontal cards)            │                         │
│                                │                         │
├────────────────────────────────┴─────────────────────────┤
│ Footer                                                    │
└──────────────────────────────────────────────────────────┘
```

### Key Design Changes

1. **Header area**: Clinic name, verified badge, location, and star rating all in one compact hero strip at the top — no card wrapping. Inline layout, not stacked.

2. **Sticky tab navigation**: A horizontal tab bar that sticks below the navbar on scroll. Sections: Overview, Treatments, Doctors, Contact. Clicking scrolls to the section smoothly. Active tab highlights based on scroll position.

3. **Image gallery upgrade**: Replace single carousel with a mosaic/grid layout — 1 large image + 2-3 smaller thumbnails visible at once. Clicking opens a fullscreen lightbox carousel. More visual, less "slideshow."

4. **Sidebar redesign**: "Get a Free Quote" heading instead of "Contact Clinic." Add trust signals: "Free online consultation", "Priority for appointments", "Response within 24h" with checkmark icons. Keep the contact form below. Add verified/accreditation badges at the bottom of the sidebar.

5. **Stats as glass-morphism cards**: Replace plain muted boxes with subtle glassmorphism cards in a 3-column row (Experience, Happy Patients, Specialties count). Compact, visual.

6. **Treatment table redesign**: Clean alternating-row table with hover effect. Each row: treatment name, duration, and price aligned right. "Get Quote" mini-button per treatment row.

7. **Doctors section**: Horizontal scroll cards with avatar placeholder, name, specialty, years — more compact, less vertical space.

8. **Remove**: Heart/favorite button (non-functional), separate Contact Information card (phone/email exposed publicly is unusual for medical tourism — keep it behind the form).

9. **Add**: Specialty badges moved into the header area (compact). "Why Choose This Clinic" trust section with icon bullets.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/ClinicDetail.tsx` | Full rewrite of the JSX layout and section structure |
| `src/index.css` | Add any new utility classes (glassmorphism, scroll-spy helpers) |

No new components needed — everything stays in ClinicDetail.tsx using existing UI primitives (Badge, Button, Card, Carousel, Dialog). The contact form component stays as-is.

### Mobile Behavior
Mobile layout stays similar to current (stacked sections, bottom CTA bar). The tab nav becomes horizontally scrollable. The image gallery becomes a single carousel. The redesign focuses on the desktop (lg+) breakpoint.

