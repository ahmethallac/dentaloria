
## What is actually broken

This is not mainly a frontend redirect-order bug anymore. The real backend/app boundary issue is:

- some admin users currently have multiple rows in `user_roles`
- I confirmed examples where the same `user_id` has `{admin, patient}`
- your app calls `get_current_user_role()`
- that DB function currently does:

```sql
SELECT role
FROM public.user_roles
WHERE user_id = auth.uid()
LIMIT 1;
```

Because there is no `ORDER BY`, Postgres may return `patient` instead of `admin`.  
So the app thinks the user is not admin and sends them into the clinic flow.

That explains why repeated “check admin before clinic” changes did not solve it: the app is sometimes receiving the wrong role value.

## Fix plan

### 1) Make role resolution deterministic in the database
Update `get_current_user_role()` so it always returns the highest-privilege role for the current user.

Priority must be:

```text
admin > clinic_admin > patient
```

Implementation approach:
- replace the current `LIMIT 1` query with an ordered query or CASE-based priority
- keep the return type as `app_role`

This is the most important fix.

### 2) Keep frontend routing strictly role-first
After the DB function is corrected, tighten routing so every auth entry point follows the same order:

```text
wait for auth loading
if no user -> /auth
if userRole === admin -> /admin
if userRole === clinic_admin -> clinic flow
if userRole === patient -> public flow or non-clinic dashboard behavior
```

Files to update:
- `src/contexts/AuthContext.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`

### 3) Stop admin users from ever entering Add Clinic
Protect `AddClinic.tsx` itself so even if an admin somehow reaches `/add-clinic` manually, they are redirected away immediately.

Behavior:
- `admin` → `/admin`
- non-authenticated → `/auth`
- only clinic accounts may continue

This prevents future leakage into the clinic setup path.

### 4) Remove ambiguous role assumptions in auth state handling
In `AuthContext`, make the role fetch explicitly authoritative:
- fetch role after user is known
- log the resolved role
- do not allow downstream routing decisions until role resolution completes

I do **not** plan to add a second competing role-fetch hook; the cleaner fix is to make the existing context reliable and use that single source of truth everywhere.

### 5) Add targeted debug logs only where useful
Add short logs at:
- `AuthContext` after role resolution
- `Auth.tsx` before redirect
- `Dashboard.tsx` before redirect
- `AddClinic.tsx` if access is denied

This will make it obvious whether the app receives `admin` or not at runtime.

## Expected result after fix

- any user with an `admin` row in `user_roles` will always resolve as `admin`
- admins will always land on `/admin`
- admins will never see clinic creation
- clinic routing will only apply to clinic accounts
- patients will remain outside the admin/clinic flow

## Technical note
The key issue is that the current schema allows multiple roles per user, but the app consumes only a single “current role”. That is fine only if the database function enforces a priority. Right now it does not, which is why the behavior is inconsistent.
