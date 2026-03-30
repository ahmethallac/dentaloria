

# Fix Plan: Sub-Admin Role, Edit Fix, and Free Clinic Discount Display

## Three Issues to Fix

### 1. Add `sub_admin` role to the system
- **Database**: Add `'sub_admin'` to the `app_role` enum. Update `get_current_user_role()` priority: admin(1) > sub_admin(2) > clinic_admin(3) > patient(4).
- **Frontend routing**: Treat `sub_admin` same as `admin` for navigation (redirect to `/admin`). Update `Auth.tsx`, `Dashboard.tsx`, `AddClinic.tsx` guards to include `sub_admin`.
- **Admin panel restrictions**: In the Admins section, only `admin` role users can add/remove admins. `sub_admin` users see the Admins tab as read-only (or hidden). When granting access from the panel, insert role as `sub_admin` (not `admin`).
- **`roleService.ts`**: Add `sub_admin` to `AppRole` type.

### 2. Fix "Edit" (now "Manage") not working in Admin panel
The current Edit button opens an inline card below the clinic list, but the `handleEditClinic` function only updates 5 basic fields. The real issue is it works but is too limited.

**Fix**: Rename "Edit" to "Manage". When clicked, navigate to `/clinic/{id}/panel` (the existing ClinicPanel page which already has full clinic editing via `ClinicInfoTab`). But add an admin-only section at the top of that page when accessed by an admin:
- **Admin Settings section** (only visible to admin/sub_admin): Billing type toggle (Paid/Free), approval status, published toggle, verified toggle, featured toggle.
- Remove the separate Billing tab from Admin.tsx entirely — billing control moves into the Manage view.
- Update `ClinicPanel.tsx` to detect admin role and show admin controls.

### 3. Free clinic: show "100% discount applied" on payment screen
The backend edge function already handles free clinics correctly (inserts purchases at $0). The frontend `ApplicationsTab.tsx` already shows "Free" text. But we need to make the discount more prominent.

**Fix in `ApplicationsTab.tsx`**:
- When `billingType === 'free'`, show a banner at the top: "100% Discount Applied — All leads are free for this clinic"
- Change the unlock bar text from `(Free)` to `100% Discount Applied — $0.00`
- Change button text to "Unlock Free (100% Discount)"

---

## Files to Change

| File | Changes |
|------|---------|
| **Migration SQL** | `ALTER TYPE app_role ADD VALUE 'sub_admin'`; update `get_current_user_role()` priority |
| `src/lib/roleService.ts` | Add `'sub_admin'` to `AppRole` type; update `isCurrentUserAdmin` to include sub_admin for panel access |
| `src/contexts/AuthContext.tsx` | No change needed (already fetches role generically) |
| `src/pages/Auth.tsx` | Add `sub_admin` to admin redirect check |
| `src/pages/Dashboard.tsx` | Add `sub_admin` to admin redirect check |
| `src/pages/AddClinic.tsx` | Add `sub_admin` to admin redirect check |
| `src/pages/Admin.tsx` | 1) Rename "Edit" → "Manage", make it navigate to `/clinic/{id}/panel`. 2) Remove Billing tab. 3) Add Admins tab with add/remove functionality restricted to `admin` role only. 4) Replace tabs with sidebar layout. |
| `src/pages/ClinicPanel.tsx` | Detect admin/sub_admin role → show admin settings section (billing toggle, approval, published, verified, featured) |
| `src/components/clinic-panel/ApplicationsTab.tsx` | Show "100% Discount Applied" banner and updated text when `billingType === 'free'` |

---

## Admin Role Management Logic

```text
Current user role === 'admin':
  → Can add sub_admin role to any user (by email lookup in profiles)
  → Can remove sub_admin from any user
  → Cannot add/remove 'admin' role (hardcoded protection)

Current user role === 'sub_admin':
  → Can see Admins list (read-only)
  → Cannot add or remove any admin/sub_admin
  → Can do everything else (manage clinics, approvals, patients)
```

The "Add Admin" flow: input email → find user in profiles → insert into `user_roles` with role `sub_admin`. RLS already allows admins to manage all roles.

