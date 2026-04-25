## Goal

Replace the existing per-lead payment flow with a **prepaid balance system** (fixed €25/lead, no exceptions, no "free" billing type), add a **balance-based default sort**, a **balance top-up page**, **panel notifications**, and a **post-form recommendations popup** with Quick Apply.

The existing `ContactClinicForm` keeps its UI/fields/validation; only its `onSuccess` signature is extended to pass the submitted values up to the parent.

---

## 1. Remove the old lead payment system

**Code/UI to delete completely**
- Edge function: `supabase/functions/create-lead-checkout/` (delete entirely).
- All `clinic_billing_settings` UI in `ClinicPanel.tsx` (Billing Type select).
- "100% Discount Applied" / `billing_type === 'free'` branches in `ApplicationsTab.tsx`.
- Free-clinic discount memory + branding (drop the green discount banner).
- Per-lead Stripe checkout button logic ("Unlock Leads" via Stripe) — replaced by balance debit.

**Database cleanup (migration)**
- Drop table `clinic_billing_settings` and its trigger `create_default_billing_settings`.
- Keep `lead_purchases` (used as the "this lead is unlocked for this clinic" record), but `stripe_payment_intent_id` is now always `'balance'` and `amount_cents` is always `2500`.
- Drop function `create_default_billing_settings`.

---

## 2. Database changes (new migration)

```text
clinic_balances
  clinic_id uuid PK references clinics(id) on delete cascade
  balance_cents int not null default 0
  updated_at timestamptz default now()

balance_transactions
  id uuid PK default gen_random_uuid()
  clinic_id uuid not null references clinics(id) on delete cascade
  type text not null check (type in ('topup','lead_charge','adjustment','refund'))
  amount_cents int not null            -- positive = credit, negative = debit
  balance_after_cents int not null
  contact_request_id uuid null references contact_requests(id)
  stripe_payment_intent_id text null
  note text null
  created_at timestamptz default now()
```

**Triggers / functions (all SECURITY DEFINER, search_path=public)**

- `ensure_clinic_balance()` — on insert into `clinics`, insert a `clinic_balances` row with 0.
- `auto_charge_lead_on_insert()` — on insert into `contact_requests`:
  - `SELECT … FOR UPDATE` the clinic's balance row.
  - If `balance_cents >= 2500`: insert `lead_purchases` (amount=2500, intent='balance'), update balance, insert `balance_transactions` (type='lead_charge', amount=-2500).
  - Else: do nothing — lead stays locked.
- `debit_balance_for_lead(p_clinic uuid, p_request uuid)` — RPC used by the manual "Unlock for €25" button when balance is sufficient. Same locking pattern; raises if insufficient or already purchased.
- `credit_balance_topup(p_clinic uuid, p_amount_cents int, p_intent text)` — called only by the webhook (service role) to credit a top-up + insert transaction.

**`clinics_public` view extension**
- Add `balance_cents int default 0` column.
- Extend `sync_clinics_public` trigger to copy current balance.
- Add a new trigger on `clinic_balances` after update → updates `clinics_public.balance_cents` for that clinic.

**RLS**
- `clinic_balances`: clinic owner SELECT own; admin ALL; no client INSERT/UPDATE.
- `balance_transactions`: clinic owner SELECT own; admin ALL; no client INSERT.

---

## 3. Edge functions

**New: `create-balance-topup`**
- Auth: requires logged-in clinic owner.
- Body: `{ clinicId, amountCents }`.
- Validates `amountCents` is one of `5000, 12000, 23000, 44000` OR a custom integer ≥ `2500`.
- Verifies user owns clinic.
- Creates Stripe Checkout `mode: payment`, EUR, single line item, with metadata `{ type: 'balance_topup', clinic_id, amount_cents }`.
- success_url → `/clinic/:id/panel/balance?topup=success`, cancel_url → `…?topup=cancelled`.

**Replace: `stripe-lead-webhook` → `stripe-balance-webhook`**
- Handles `checkout.session.completed` for `metadata.type === 'balance_topup'` only.
- Calls `credit_balance_topup` RPC with service role.
- Old per-lead branch is removed.

**New: `recommend-clinics`** (public, no auth)
- Returns up to 3 random clinics from `clinics_public` where `balance_cents > 0`, optionally excluding `excludeClinicId`.
- Includes `id, name, primary image url`.

**New: `quick-apply`** (public, no auth)
- Body: `{ targetClinicId, name, email, phone, message?, treatment? }`.
- Same sanitization + `check_contact_submission_allowed` rate-limit as the form.
- Inserts a `contact_requests` row → trigger handles balance debit automatically.

---

## 4. Frontend changes

**Listing sort (balance-first)**
- `src/lib/services.ts` `getClinics`: order chain becomes
  `.order('balance_cents', { ascending: false, nullsFirst: false })`
  `.order('is_featured', { ascending: false })`
  `.order('rating', { ascending: false })`
  `.order('review_count', { ascending: false })`.
- Filtering by city / treatment / country **does not change** the order — balance sort stays active because the order chain is unconditional.
- `ClinicListing.tsx`: only when the user picks a manual option from the sort dropdown (price asc/desc, rating, etc.) do we pass an explicit `sortBy` that overrides the default. Clearing the dropdown, refreshing, or changing filters returns to balance sort automatically (manual sort lives only in the dropdown state).
- Balance value is **never rendered** in any public UI.

**Clinic panel — balance widget + Add Balance**
- New `BalanceWidget` shown at top of Overview and Patients sections:
  - "Balance: **€X.XX** (Y leads remaining)".
  - Green **Add Balance** button → `/clinic/:id/panel/balance`.
- Live updates via `supabase.channel` on `clinic_balances` row.

**New page: Balance top-up** (`/clinic/:id/panel/balance`)
- Current balance + lead equivalent.
- 4 package cards: 2 leads → €50, 5 → €120, 10 → €230, 20 → €440.
- "Custom amount (€)" input, min 25.
- On click → `create-balance-topup` → redirect to Stripe.
- On `?topup=success` → success toast and refresh balance.

**Patients tab — three sub-tabs**
Replace existing single list in `ApplicationsTab.tsx`:
- **Pending** — created within last 48h, not in `lead_purchases`. Locked rows show masked email/phone + per-row **Unlock for €25** button + bulk **Unlock All** button. Both call the `debit_balance_for_lead` RPC. If balance insufficient, button is disabled and shows "Top up balance to unlock".
- **Expired** — older than 48h, not in `lead_purchases`. Masked, unlock disabled, "Expired" badge.
- **Purchased** — in `lead_purchases`. Full details + notes (existing UI, minus discount banner).
- Auto-charged leads from the trigger appear in Purchased instantly.

**Notifications inside the panel**
- Banner in `ClinicPanel`:
  - `balance_cents < 5000` (under 2 leads) → yellow "Low balance — top up soon".
  - `balance_cents === 0` → red "Balance empty — incoming leads will be locked until you top up".
- Click-to-dismiss for the session.

**Post-form recommendations popup**
- New `PostFormRecommendationsDialog` component:
  - Header: *"We recommend applying to at least 3 clinics to find the best one for you."*
  - 3 rows from `recommend-clinics` (excluding the just-submitted clinic).
  - Each row: thumbnail + name, **Visit Clinic Page** → `/clinic/:id`, **Quick Apply** → calls `quick-apply` with the user's submitted values.
  - Quick-applied rows show a green check + "Sent" and disable the button.
- Wired wherever `ContactClinicForm` is used (`ClinicDetail` and any contact modals).

**`ContactClinicForm` — minimal change**
- Change `onSuccess?: () => void` → `onSuccess?: (values: { name: string; email: string; phone: string; treatment?: string; message?: string; clinicId: string }) => void`.
- Form internals (fields, validation, sanitization, rate-limit, submit animation) are unchanged.
- Parents pass `onSuccess={(values) => openRecommendationsDialog(values)}`.

---

## 5. Files to add / change / delete

**Add**
- `supabase/migrations/<ts>_balance_system.sql`
- `supabase/functions/create-balance-topup/index.ts`
- `supabase/functions/stripe-balance-webhook/index.ts`
- `supabase/functions/recommend-clinics/index.ts`
- `supabase/functions/quick-apply/index.ts`
- `src/components/clinic-panel/BalanceWidget.tsx`
- `src/pages/BalanceTopupPage.tsx`
- `src/components/forms/PostFormRecommendationsDialog.tsx`

**Edit**
- `src/lib/services.ts` (sort change, balance helpers, lead bucketing by 48h, drop billing-settings calls)
- `src/pages/ClinicListing.tsx` (manual sort overrides; no other UI change)
- `src/pages/ClinicPanel.tsx` (balance widget, banners, balance route, remove billing-type UI)
- `src/components/clinic-panel/ApplicationsTab.tsx` (3 sub-tabs, balance-debit unlock, drop free-discount UI)
- `src/components/forms/ContactClinicForm.tsx` (extend `onSuccess` signature only)
- `src/pages/ClinicDetail.tsx` and any other place rendering the form (wire popup)
- `src/integrations/supabase/types.ts` (auto-regenerated)

**Delete**
- `supabase/functions/create-lead-checkout/` (and call `supabase--delete_edge_functions`)
- `supabase/functions/stripe-lead-webhook/` (replaced by `stripe-balance-webhook`; delete via tool)
- All references to `clinic_billing_settings` and `billing_type` across the codebase.

---

## 6. Stripe configuration note

Top-up Checkout sessions use EUR and a fixed line item per request. The existing `STRIPE_SECRET_KEY` secret is reused. After deploying `stripe-balance-webhook`, the user must update the Stripe webhook endpoint URL in their Stripe dashboard (or I can confirm the new URL when deployed).

---

## 7. What stays untouched

- `ContactClinicForm` UI, fields, validation, sanitization, rate-limit, animation.
- All admin pages (clinics list, approvals, users, patients).
- Auth flow, roles, RLS pattern.
- Clinic detail page layout, gallery, doctors, treatments.
- Balance is **never** shown to public users — only inside the clinic panel.
