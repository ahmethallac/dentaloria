

# Unified Admin Panel + Clear Role Management

## Part 1 — Make the "super admin" role explicit and visible

Today the `app_role` enum has `admin` (which already IS the super admin), `sub_admin`, `clinic_admin`, `patient`. The confusion is that "admin" doesn't read as "super admin" in the UI. Fix:

- **Rename in the UI only** — everywhere the role `admin` is shown (badges, labels, dropdowns), display it as **"Super Admin"**. Keep the DB enum value as `admin` to avoid breaking existing RLS / functions.
- **Add a "My Role" badge** in the panel header so any logged-in user instantly sees what they are: Super Admin / Sub-Admin / Clinic Admin / Patient.
- **Document the four roles** in a small "Roles" info panel on the Admins page.

## Part 2 — Full user management from the Dentaloria admin panel

Replace the current "Add Admin" mini-form (which only finds users via clinic email and only creates `sub_admin`) with a real **Users** section.

**New "Users" sidebar item** (visible only to Super Admin), with two tabs:

1. **All Users** — searchable table of every account: name, email, current role(s), created date, actions (Change Role, Remove Role).
2. **Create User** — form to create a brand-new account from the panel:
   - Email, full name, temporary password, role dropdown (**Super Admin / Sub-Admin / Clinic Admin / Patient**).
   - Submits to a new edge function `admin-create-user` that uses the Supabase **service role key** to call `auth.admin.createUser` + insert the chosen role into `user_roles`. (Service role key already exists in secrets.)
   - Only callable by users with the `admin` role (verified server-side).

**Also add an `admin-update-user-role` edge function** so Super Admin can promote/demote any user (Super Admin → Sub-Admin → Clinic Admin → Patient) from the table without needing Supabase access. Same admin-only guard.

This removes the limitation that users must already exist or be tied to a clinic email.

## Part 3 — Unified desktop admin shell ("Open Admin" style)

Right now `/admin` has a sidebar but `/clinic/:id/panel` is a stacked mobile-style page. Build **one shared layout** used by every panel route on the site so everything looks like a real desktop SaaS dashboard.

### New shared layout: `src/components/layout/AdminShell.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│  Dentaloria          [search]                  [role badge] │  ← top header (sticky)
├──────────────┬──────────────────────────────────────────────┤
│              │  Page Title                  Home / Section  │
│  Sidebar     │  ──────────────────────────────────────────  │
│              │                                              │
│  • Dashboard │   [stat] [stat] [stat] [stat]                │
│  • Clinics   │                                              │
│  • Approvals │   ┌──────────────────────────────────────┐   │
│  • Patients  │   │  Data table / forms / content        │   │
│  • Users     │   │                                      │   │
│  • Settings  │   └──────────────────────────────────────┘   │
│              │                                              │
│  [collapse]  │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- Dark slate sidebar (matches the reference screenshots), white content area, breadcrumb under page title, sticky top header with logo + global search + user/role chip + sign-out.
- Built on existing shadcn `Sidebar` (icon-collapsible) so it stays usable on tablets; on mobile it slides in as a drawer.
- Exposes `<AdminShell sidebarItems={...} title="..." breadcrumb="...">{children}</AdminShell>`.

### Apply the shell to:

- **`/admin`** — items: Dashboard, Clinics, Pending Approvals, All Patients, Users, *(Back to Site)*.
- **`/clinic/:id/panel`** — items: Overview, Patients (Leads), Clinic Information, Doctors, Treatments, Images, Settings, *(Back)*. Each becomes its own routed view inside the shell instead of one giant scrolling page with stacked cards. The Admin-only "Admin Settings" card becomes its own **Settings** sidebar entry visible only to `admin`/`sub_admin`.
- **`/dashboard`** (clinic admin's landing) — same shell, just a different sidebar item set.

Result: consistent left-sidebar admin UX everywhere a logged-in operator works.

### Visual rules
- Sidebar: `bg-slate-900` text-slate-100, active item highlighted with primary color left-border.
- Tables: striped rows, hover state, sticky header, action icons on the right (edit / view / delete).
- Stat cards: 4-up on desktop, 2-up on tablet, 1-up on mobile.
- Top header: 56px, sticky, contains sidebar trigger (always visible).

## Technical details (for reference)

- DB: no enum change. Add nothing schema-wise except optionally a `display_name` column on `user_roles` later — not needed for v1.
- Two new edge functions: `admin-create-user`, `admin-update-user-role`. Both verify `has_role(auth.uid(), 'admin')` server-side before doing anything privileged. They use `SUPABASE_SERVICE_ROLE_KEY` (already in secrets) for `auth.admin.*` calls.
- `roleService.ts`: add `displayRoleName(role) → "Super Admin" | "Sub-Admin" | "Clinic Admin" | "Patient"` helper used everywhere.
- `AdminShell` lives in `src/components/layout/`. Sidebar items and the active route are passed in by each page; the shell handles the chrome.
- `ClinicPanel.tsx` is refactored from one tabbed page into a routed shell with sub-views (`overview`, `patients`, `info`, `doctors`, `treatments`, `images`, `settings`). URL becomes `/clinic/:id/panel/:section`. Default section = `overview`.
- The current Admin page's "Add admin" form is removed and replaced with the new Users section.

## Acceptance criteria

- Super Admin role appears clearly labeled "Super Admin" anywhere a role is shown.
- Logged-in Super Admin sees a "Users" item in the sidebar; can create users of any role and change/remove anyone's role from a table — without touching Supabase.
- `/admin`, `/clinic/:id/panel`, and `/dashboard` all use the same desktop shell with a left sidebar, sticky top header, breadcrumb, and structured content area matching the reference screenshots.
- On mobile, the sidebar collapses into a drawer; nothing is broken.
- Existing flows (approvals, patient table, clinic info editing, billing toggle) still work, just relocated into sidebar sections.

