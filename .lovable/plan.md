

# Add Forgot Password + Reset Password Flow

## Goal
Add a working "Forgot password" link on `/auth` and a `/reset-password` page so any user (including the super admin) can recover their account from the site itself.

## Files to change

### 1. `src/pages/Auth.tsx` (edit)
- Under the Sign In form's password field, add a small right-aligned **"Forgot password?"** link.
- Clicking it opens a lightweight inline view (or toggles the tab content) with:
  - Email input
  - "Send reset link" button
- On submit, call:
  ```ts
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  ```
- Show a toast: "If that email exists, a reset link has been sent."
- Provide a "Back to sign in" link to return to the login form.

### 2. `src/pages/ResetPassword.tsx` (new)
- Public route — no auth guard.
- On mount, Supabase auto-consumes the recovery token from the URL hash and creates a temporary recovery session. Listen via `supabase.auth.onAuthStateChange` for the `PASSWORD_RECOVERY` event to confirm the user landed via a valid link.
- Render a form with:
  - New password
  - Confirm new password
  - Min 6 chars, must match (mirror existing signup validation)
- On submit, call `supabase.auth.updateUser({ password })`.
- On success: toast + sign the user out + redirect to `/auth` so they log in fresh with the new password.
- If the page is opened without a recovery session (e.g., direct visit), show a clear message: "This link is invalid or expired. Request a new reset email." with a button back to `/auth`.

### 3. `src/App.tsx` (edit)
- Register the new route **above** the catch-all:
  ```tsx
  <Route path="/reset-password" element={<ResetPassword />} />
  ```

## Behavior summary
- User clicks "Forgot password?" on `/auth` → enters email → receives Supabase recovery email.
- Email link points to `https://<site>/reset-password#access_token=...&type=recovery`.
- Reset page detects the recovery session, lets them set a new password, signs them out, and sends them back to `/auth`.

## Acceptance criteria
- "Forgot password?" link is visible on the Sign In tab.
- Submitting an email shows a confirmation toast and triggers Supabase to send the recovery email.
- Visiting the email link opens `/reset-password` with the new-password form.
- Submitting a valid new password updates it, signs the user out, and redirects to `/auth`.
- Visiting `/reset-password` directly (no token) shows the "invalid or expired" state.
- Existing Sign In and Register Clinic flows are unchanged.

## Notes
- No DB migrations needed.
- No edge functions needed — Supabase sends the recovery email using its built-in (or already-configured) auth email templates for this project.
- After this is in place, you can use it immediately to recover `info@dentalturkey.clinic` from the live site.

