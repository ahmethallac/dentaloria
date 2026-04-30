## Goal

Enhance the All Patients section in `/admin?section=patients` with: a single Export dropdown (CSV / XLSX), a date range selector with presets and custom range, a Clear button that resets all filters and dates, and row selection (individual + select-all) with a count badge.

## Changes (single file: `src/pages/Admin.tsx`)

### 1. Track per-patient submission dates
In the `patientMap` aggregation (lines ~116–155), add a `dates: Date[]` set per patient so we can date-filter without re-querying. Currently we keep only `lastDate`; we'll also push every submission's `created_at`.

### 2. Date range state + preset enum
Add state:
- `patientDateRange: 'today' | 'yesterday' | 'last2weeks' | 'lastMonth' | 'thisYear' | 'lastYear' | 'all' | 'custom'` (default `'all'`)
- `patientCustomRange: { from?: Date; to?: Date }`

Helper `getDateBounds(preset, custom)` returns `{ from, to }` or `null` for 'all'.

### 3. Date range UI
Add to the filter row (alongside country/city/language) a `Select` with the preset options. When `custom` is chosen, render a `Popover` containing the shadcn `Calendar` in `mode="range"` (with `pointer-events-auto`) so the user can click a start and end day. Selected range displayed as a small chip ("Mar 1 – Mar 14").

### 4. Apply date filter
In the `filtered` computation, after existing checks, keep the patient only if at least one of their submission dates falls within the selected `[from, to]` range (matches "any clinic the patient applied to" semantics already used).

### 5. Export dropdown (single button, smaller, right-aligned)
Replace the two buttons in `CardHeader` with one `DropdownMenu`:
- Trigger: small outline `Button size="sm"` labeled "Export" with a Download icon and chevron.
- Menu items: "Download as CSV" (calls `downloadCsv`) and "Download as XLSX" (calls `downloadXlsx`).
- Both actions already use `filtered`, which will now also reflect the date range — so exports automatically respect filters + dates.

### 6. Clear button
Always visible (not only when filters active) next to the row count. Resets:
- `patientSearch`, `patientFilterCountry`, `patientFilterCity`, `patientFilterLanguage` to `'all'`/empty
- `patientDateRange` to `'all'`, `patientCustomRange` to `{}`
- `selectedPatients` to empty set

### 7. Row selection with count
- Add `selectedPatients: Set<string>` state keyed by patient email.
- New leftmost table column with a `Checkbox` per row.
- Header has a master `Checkbox` with three states (none / some / all of currently filtered).
  - Click toggles select-all for the currently filtered list.
- Above the table, show a small selection summary:
  - none selected: "0 selected"
  - some: "N of {filtered.length} selected"
  - all filtered selected and filters active: "All N filtered selected"
  - all filtered selected and no filters active: "All {patients.length} patients selected"
- Selection persists across filter changes but the visible counter is based on the current filtered list.

## Technical Notes

- shadcn already exports `DropdownMenu`, `Popover`, `Calendar`, `Checkbox` — no new deps.
- `Calendar` must use `mode="range"` with `selected={patientCustomRange}` and `onSelect={setPatientCustomRange}`, and `className="p-3 pointer-events-auto"` so it works inside the popover.
- `getDateBounds` (local to the patients render block):
  - today: start of today → end of today
  - yesterday: start of yesterday → end of yesterday
  - last2weeks: now-14d → now
  - lastMonth: now-1month → now
  - thisYear: Jan 1 of current year → now
  - lastYear: Jan 1 → Dec 31 of previous year
  - all: null (skip filter)
  - custom: `patientCustomRange.from` → `patientCustomRange.to ?? from`
- All dates compared against each `dates[]` entry; patient included if any date falls within bounds.
- Export functions (`downloadCsv`, `downloadXlsx`) are unchanged — they already build rows from `filtered`, which will now incorporate date filtering automatically. If any patients are selected, exports use only the selected subset; otherwise they use the full filtered list.
- No DB or schema changes required.
- No edge function changes required.

## Files Touched

- `src/pages/Admin.tsx` (only)
