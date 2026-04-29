## Clinic page & panel improvements

### 1. Remove the "Specialties" badges block
In `src/pages/ClinicDetail.tsx` (header area, ~lines 513–521), remove the `clinic.specialties.map(...)` Badge block. Specialties are auto-derived from treatments — the user wants only what the clinic explicitly entered to appear.
Also remove the "Specialties" Quick Stat card (~lines 672–682) that uses `clinic.specialties.length` (it's not entered by the clinic).

### 2. New section order on clinic detail page
Reorder the main column in `ClinicDetail.tsx` to:
1. Clinic images (gallery) — already first
2. About the Clinic (description)
3. Supported Languages
4. Facilities & Amenities
5. Treatment Prices
6. Before & After
7. Doctors

Move the `Languages` block above `Facilities`, then move `Treatments` above `Before & After`, then `Doctors` last (it currently is). Keep Quick Stats card (Years Experience + Happy Patients only) directly under About.

### 3. Tabs: Overview · About · Photos · Treatments · Doctors
Replace `TABS` in `ClinicDetail.tsx`:
```ts
const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "about",      label: "About" },
  { id: "photos",     label: "Photos" },     // before/after
  { id: "treatments", label: "Treatments" },
  { id: "doctors",    label: "Doctors" },
];
```
- Bind `sectionRefs.current["about"]` to a wrapper around description + languages + facilities (the About cluster).
- Bind `sectionRefs.current["photos"]` to the Before & After section (rename internal id from `gallery` to `photos`).
- Drop the standalone `facilities` and `languages` section refs.

### 4. Clinic panel — single Save button
In `src/components/clinic-panel/ClinicInfoTab.tsx` and the section managers:
- Remove the per-section "Save Treatments" button in `ClinicTreatmentsManager.tsx` (line 129). Replace internal `save()` with an imperative handle (`useImperativeHandle`) so the parent can trigger save.
- `ClinicDoctorsManager` and `ClinicBeforeAfterManager` already auto-persist on add/delete/reorder — keep those CRUD modal "Save" buttons since they're for adding individual items, not saving the section. The user's request is about removing redundant whole-section save buttons; modal confirm buttons remain. **Confirmation note:** if the user wants those modal Save buttons gone too, they can clarify after seeing the result.
- `ClinicImagesManager` has no section save — fine.
- Keep one global "Save All" button at the bottom of `ClinicInfoTab` (replaces current "Update Information"). On click it:
  1. Calls `updateClinic(...)` with the form fields, languages, facilities.
  2. Calls the treatments manager's exposed `save()` via ref.
  3. Shows one toast covering both.

### 5. Before & After lightbox with swipe
In `BeforeAfterCarousel` (`ClinicDetail.tsx` ~lines 116–171):
- Add click handler on each thumbnail to open a fullscreen `Dialog` (already imported).
- Inside the dialog use the existing `Carousel` component (`src/components/ui/carousel.tsx`) with `CarouselPrevious` / `CarouselNext`, starting at the clicked index (`opts={{ startIndex: idx, loop: true }}`).
- Touch swipe works out of the box via embla. Add a close (X) button.

### 6. Read more / collapse for long descriptions
In the "About the Clinic" block in `ClinicDetail.tsx` (~lines 638–646):
- Wrap description in a div with conditional `max-h-[12rem] overflow-hidden` + bottom fade gradient when collapsed.
- Below: a `Read more` / `Show less` button toggling state. Only render the button if the rendered HTML's text length exceeds ~400 chars (measured via a ref + `scrollHeight > clientHeight`).
- Use `ChevronDown` / `ChevronUp` icon next to label.

### Technical notes
- No DB changes needed.
- `clinic.specialties` stays in the mapper (still used for SEO meta) but is no longer rendered.
- Imperative ref pattern for the treatments manager:
  ```ts
  export type ClinicTreatmentsHandle = { save: () => Promise<void> };
  forwardRef<ClinicTreatmentsHandle, Props>(...)
  ```
- Lightbox: reuse shadcn `Dialog` + `Carousel` to avoid extra deps.

### Files to edit
- `src/pages/ClinicDetail.tsx` — items 1, 2, 3, 5, 6
- `src/components/clinic-panel/ClinicInfoTab.tsx` — item 4 (single save, ref wiring)
- `src/components/clinic-panel/ClinicTreatmentsManager.tsx` — item 4 (forwardRef, remove inline save button)
