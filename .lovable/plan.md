## Overview

Two additions to the lead-purchase flow:
1. Allow clinics to **select pending leads and pay for them directly** via Stripe (no balance required), through a dedicated intermediate **Purchase Leads page** that mirrors the balance top-up page pattern (summary + discount code + final Pay button).
2. Add a **discount code system** with `AHMET100` as a 100%-off, unlimited-use code, available on both the lead-purchase page and the balance top-up page.

The balance system remains untouched. Direct purchase is an additional path for clinics with no balance (and a convenience for everyone).

---

## 1. Database changes (migration)

### New table: `discount_codes`
```text
code              text PRIMARY KEY (uppercase, normalized server-side)
percent_off       integer (0–100)
is_active         boolean default true
max_uses          integer NULL          -- NULL = unlimited
used_count        integer default 0
expires_at        timestamptz NULL
created_at        timestamptz default now()
```
RLS: no public access. All reads/writes go through SECURITY DEFINER RPCs.

Seed: `('AHMET100', 100, true, NULL, 0, NULL)`.

### New table: `discount_redemptions`
```text
id                uuid pk
code              text
clinic_id         uuid
context           text     -- 'direct_lead_purchase' | 'balance_topup'
amount_off_cents  integer
stripe_session_id text
created_at        timestamptz
```
Audit trail; webhook inserts a row and bumps `discount_codes.used_count`.

### New RPC: `validate_discount_code(p_code text, p_amount_cents int)`
Returns JSON `{ valid, percent_off, amount_off_cents, final_cents, reason }`. Checks active, not expired, `used_count < max_uses` when set. `authenticated` callable.

### New RPC: `mark_lead_purchased(p_clinic uuid, p_request uuid, p_intent text, p_amount_cents int)`
SECURITY DEFINER. Idempotent insert into `lead_purchases` for a single lead. Used by the webhook for direct purchases.

---

## 2. New edge function: `create-direct-lead-purchase`

Body: `{ clinicId, requestIds: string[], discountCode?: string }`

- Auth + verify clinic ownership (mirrors `create-balance-topup`).
- Validate `requestIds`: belong to `clinicId`, not already purchased, not expired (>48h).
- `subtotalCents = requestIds.length * 2500`.
- If `discountCode` set, run `validate_discount_code` server-side → `finalCents`.
- If `finalCents === 0`: skip Stripe, call `mark_lead_purchased` for each id, insert `discount_redemptions`, return `{ success: true, freeUnlock: true }`.
- Otherwise create Stripe Checkout session with metadata:
  ```
  type=direct_lead_purchase
  clinic_id, user_id
  request_ids=<comma-joined>
  discount_code=<code or "">
  amount_off_cents=<int>
  ```
  - success_url: `/clinic/:id/panel?section=patients&purchase=success`
  - cancel_url: `/clinic/:id/panel/purchase-leads?ids=<csv>&purchase=cancelled`

## 3. Edge function update: `stripe-balance-webhook`

Extend handler to also process `metadata.type === 'direct_lead_purchase'`:
- Parse `request_ids`, loop and call `mark_lead_purchased`.
- If `discount_code` present, insert `discount_redemptions` row and `UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ...`.

(Existing `balance_topup` handling untouched.)

## 4. Edge function update: `create-balance-topup`

Accept optional `discountCode`. Validate, apply discount to the Stripe `unit_amount`, and stamp `metadata.discount_code` + `metadata.amount_off_cents`. The webhook continues to credit balance based on `amount_cents` metadata — for top-ups we credit the **original (pre-discount) lead value**, since the discount is applied to the price the clinic pays, not the balance they receive. (We can flip this if you'd rather credit only the paid amount — current plan: pay €0 with AHMET100 → still receive the package's lead credit.)

If discount yields €0 total: skip Stripe, call `credit_balance_topup` directly, log redemption, return `{ success: true, credited: true }`.

---

## 5. Frontend: `ApplicationsTab.tsx` (Pending bucket)

Add multi-select to the Pending tab — no modal, no purchase UI here, just selection + a CTA that navigates to the new page.

- State: `selectedIds: Set<string>`.
- Per pending lead row: a **Checkbox** on the left.
- Sticky action bar above the list when `selectedIds.size > 0`:
  ```
  ☐ Select all (visible)        3 selected · €75
  [Unlock with balance]   [Buy selected leads →]
  ```
  - "Unlock with balance" — shown only when `balanceCents >= selected * 2500`. Loops `debit_balance_for_lead` (existing logic).
  - "Buy selected leads" — always shown when ≥1 selected. Navigates to `/clinic/:id/panel/purchase-leads?ids=<csv>`.
- Existing per-row "Unlock for €25" (balance) button is preserved.
- Existing "Unlock All" affordance preserved for users with sufficient balance.
- Add `useEffect` to detect `?purchase=success` on mount → toast + refetch + clean param.

## 6. New page: `PurchaseLeadsPage.tsx` (route `/clinic/:id/panel/purchase-leads`)

Mirrors `BalanceTopupPage` layout/styling.

URL: `/clinic/:id/panel/purchase-leads?ids=<comma-separated-uuids>`.

On load:
- Auth gate (redirect to `/auth` if needed).
- Parse `ids` from query string. If empty → redirect back to panel.
- Fetch the corresponding `contact_requests` rows (verifying clinic ownership via RLS).
- Filter out any that are already in `lead_purchases` or expired (>48h); show a notice if some were dropped.

UI:
- Back link → `/clinic/:id/panel?section=patients`.
- **Summary card**: list of selected leads (name + masked email + created date), count, subtotal `N × €25 = €X`.
- **Discount code card**: text input + `Apply` button.
  - On Apply: call `validate_discount_code` RPC. Show `✓ AHMET100 applied — −€X (100% off)` or an inline error.
  - Show `Remove` link to clear the code.
- **Total card**: subtotal, discount line (if any), final total.
- **Pay button**:
  - Final > 0: label `Pay €X` → invokes `create-direct-lead-purchase` with `{ clinicId, requestIds, discountCode? }` → redirect to `data.url`.
  - Final = 0: label `Unlock for free` → same invoke → on `freeUnlock: true`, toast + navigate to `/clinic/:id/panel?section=patients&purchase=success`.
- Handles `?purchase=cancelled` query param → toast, no charge.

Register the route in `src/App.tsx`:
```tsx
<Route path="/clinic/:id/panel/purchase-leads" element={<PurchaseLeadsPage />} />
```

## 7. Frontend: `BalanceTopupPage.tsx`

Add a **discount code section** between the packages grid and the custom-amount card, using the same Apply/Remove pattern as the purchase page. The applied code is passed as `discountCode` to `create-balance-topup` for both package buys and the custom amount. If the function returns `{ credited: true }` (free top-up), show a toast and refresh balance instead of redirecting.

---

## Files

**New**
- `supabase/migrations/<ts>_discount_codes_and_direct_purchase.sql`
- `supabase/functions/create-direct-lead-purchase/index.ts`
- `src/pages/PurchaseLeadsPage.tsx`

**Modified**
- `src/App.tsx` — register `/clinic/:id/panel/purchase-leads` route
- `supabase/functions/stripe-balance-webhook/index.ts` — handle `direct_lead_purchase` + redemption logging
- `supabase/functions/create-balance-topup/index.ts` — accept + apply `discountCode`, free-credit shortcut
- `src/components/clinic-panel/ApplicationsTab.tsx` — checkboxes, selection bar, navigate to purchase page, success-param handling
- `src/pages/BalanceTopupPage.tsx` — discount code input + pass to function + free-top-up shortcut

## Notes

- The existing Stripe webhook URL keeps pointing at `stripe-balance-webhook`; it now branches on `metadata.type` for both top-ups and direct purchases.
- `AHMET100` is seeded as unlimited (`max_uses = NULL`). Future codes can be added via SQL with limits/expiry.
- Expired (>48h) leads can't be selected for direct purchase — the same rule as balance unlock.
- Per-row "Unlock for €25" using balance is unchanged so existing balance-based workflows are unaffected.
