## Problem

When applying `AHMET100` (100% discount) and clicking "Unlock for free":

1. The edge function `create-direct-lead-purchase` actually **does unlock the leads** successfully (the `mark_lead_purchased` RPC runs first), but then crashes on a stray line:
   ```ts
   await supabaseAdmin.rpc("__noop__").catch(() => {});
   ```
   The Supabase JS v2 builder returned by `.rpc()` does not expose `.catch()` directly — the call throws `TypeError: supabaseAdmin.rpc(...).catch is not a function` (confirmed in edge function logs). The function returns a 500 → frontend shows "Edge Function returned a non-2xx status code".

2. Because the leads were already silently unlocked before the crash, when the clinic returns to the purchase page and retries, the page detects them as "already purchased" and displays *"1 selected lead was removed (already purchased, expired, or invalid). No purchasable leads."*

## Fix

Remove the broken `__noop__` line and tighten the free-unlock branch in `supabase/functions/create-direct-lead-purchase/index.ts`:

- Delete the `await supabaseAdmin.rpc("__noop__").catch(() => {});` line entirely (it serves no purpose).
- Replace the awkward `used_count` increment (which does a separate read then update — racy and prone to type errors) with a direct update using the current value fetched in one step. Keep behavior simple: read `used_count`, then update.
- If the `mark_lead_purchased` RPC errors for any lead, return a 500 with a clear message instead of silently logging — so the frontend never shows success when nothing was unlocked, and never silently consumes leads on a partial failure.
- Wrap the discount-redemption insert + used_count update in best-effort try/catch so a logging failure never prevents the success response (the leads are already unlocked at that point).

No database migration, no frontend changes needed. The intermediate purchase page, discount UI, and `validate_discount_code` RPC all work correctly — only the edge function's free-unlock branch is broken.

## Recovery for the user

The leads the clinic already "lost" to the silent unlock are in fact already unlocked in their account — they should appear as purchased/visible in the Patients tab. No data is lost; they just weren't shown the success state.

## Files

- `supabase/functions/create-direct-lead-purchase/index.ts` — fix free-unlock branch (lines ~120–144)
