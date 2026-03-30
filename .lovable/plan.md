

# Complete Business System Overhaul Plan

## Overview

Transform the current basic clinic listing site into a full lead marketplace with patient data collection, clinic verification/approval, paid lead access via Stripe, and an admin panel.

---

## Architecture Summary

```text
                    ┌──────────────┐
                    │   Visitors   │
                    │  (Patients)  │
                    └──────┬───────┘
                           │ Submit contact form
                           ▼
                  ┌─────────────────┐
                  │  contact_requests │ ← "Patients" pool
                  │  (leads table)   │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Clinic A │ │ Clinic B │ │ Clinic C │
        │ (Paid)   │ │ (Free)   │ │ (Paid)   │
        └──────────┘ └──────────┘ └──────────┘
              │                         │
              │ Select leads → Pay $25  │
              │ via Stripe              │
              ▼                         ▼
        Contact info revealed     Contact info revealed
        
                    ┌──────────────┐
                    │    Admin     │
                    │   Panel      │
                    └──────────────┘
                    • Approve/reject clinics
                    • Set Free/Paid status
                    • Edit any clinic
                    • View all data
```

---

## Database Changes

### 1. New table: `clinic_approvals`
Tracks clinic registration approval status.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| clinic_id | uuid | FK → clinics |
| status | text | 'pending' / 'approved' / 'rejected' |
| rejection_reason | text | nullable |
| tax_certificate_url | text | Storage path |
| health_tourism_doc_url | text | Storage path |
| reviewed_by | uuid | nullable, admin user_id |
| reviewed_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

### 2. New table: `lead_purchases`
Tracks which leads a clinic has paid for.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| clinic_id | uuid | FK → clinics |
| contact_request_id | uuid | FK → contact_requests |
| stripe_payment_intent_id | text | Stripe reference |
| amount_cents | integer | Amount paid (2500 = $25) |
| purchased_at | timestamptz | default now() |

### 3. New table: `clinic_billing_settings`
Admin-controlled billing status per clinic.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| clinic_id | uuid | FK → clinics, unique |
| billing_type | text | 'paid' / 'free' |
| price_per_lead_cents | integer | default 2500 |
| updated_by | uuid | admin user_id |
| updated_at | timestamptz | default now() |

### 4. Modify `clinics` table
- Add `approval_status` column (text, default 'pending') — for quick lookups without joining

### 5. New storage bucket: `clinic-documents`
For tax certificates and health tourism authorization documents. Private bucket (not public).

### 6. RLS Policies
- `clinic_approvals`: Clinic owners can read their own; admins can read/write all
- `lead_purchases`: Clinic owners can read their own; admins can read all
- `clinic_billing_settings`: Admins only for write; clinic owners can read their own
- `clinic-documents` bucket: Authenticated upload; admin read access

---

## Feature Breakdown

### Feature 1: Patients Data Pool

**What changes:**
- Rename "Applications" tab in clinic panel to "Patients"
- Contact form submissions (already stored in `contact_requests`) become the shared lead pool
- Contact details (phone, email) are **hidden** by default — shown only after purchase
- In the clinic panel's Patients tab, show leads with masked contact info (e.g., `j***@***.com`, `+90 5** *** **12`)

**Files:** `src/components/clinic-panel/ApplicationsTab.tsx`, `src/lib/services.ts`

### Feature 2: Clinic Registration with Document Upload

**What changes:**
- Redesign `Auth.tsx` signup form to collect:
  - Clinic name (used as display name)
  - Contact email
  - Password
  - Tax certificate upload (PDF/image)
  - Health tourism authorization document upload (PDF/image)
- After signup, clinic status = `pending` (not `approved`)
- Clinic cannot add/edit clinic info until approved
- Files uploaded to `clinic-documents` private storage bucket

**Files:** `src/pages/Auth.tsx`, `src/lib/auth.ts`, `src/lib/services.ts`

### Feature 3: Approval Flow via Email

**What changes:**
- New edge function: `clinic-approval-action` — handles approve/reject from email links
- When a clinic registers, send email to `info@dentalturkey.clinic` with two links:
  - Approve link: `https://dentaloria.lovable.app/admin/approve-clinic?id=XXX&token=YYY&action=approve`
  - Reject link: `https://dentaloria.lovable.app/admin/approve-clinic?id=XXX&token=YYY&action=reject`
- New page: `/admin/approve-clinic` — shows clinic details, approve button, reject button with reason textarea
- Approval tokens stored in `clinic_approvals` or generated as signed JWTs
- On approve: update `clinics.approval_status = 'approved'`, send confirmation email to clinic
- On reject: update status, store reason, notify clinic

**Files:** New edge function, new page `src/pages/AdminApproveClinic.tsx`, `src/lib/services.ts`

### Feature 4: One Clinic Per Account

**What changes:**
- After registration and approval, the clinic's account is tied to exactly one clinic
- Remove "Add New Clinic" button from dashboard
- On login, redirect directly to the clinic's panel (not to a list of clinics)
- The `AddClinic.tsx` page becomes a one-time setup step post-approval

**Files:** `src/pages/Dashboard.tsx`, `src/pages/AddClinic.tsx`, navbar logic

### Feature 5: Professional Clinic Dashboard

**What changes:**
- Redesign the clinic panel (`ClinicPanel.tsx`) with a sidebar layout:
  - Overview/stats cards (total leads, purchased leads, pending leads)
  - Clinic Information section
  - Patients section (leads with masked/revealed contacts)
- More polished UI with proper cards, icons, metrics

**Files:** `src/pages/ClinicPanel.tsx`, new components

### Feature 6: Lead Purchase with Stripe

**What changes:**
- Enable Stripe integration
- In the Patients tab, each lead row has a checkbox for selection
- "Unlock Selected Leads" button at the bottom
- Clicking it:
  1. Checks `clinic_billing_settings` for this clinic
  2. If `free`: mark leads as purchased (100% discount, $0 charge), reveal contacts immediately
  3. If `paid`: create Stripe checkout session for `$25 × selected_count`
  4. After successful payment: insert into `lead_purchases`, reveal contact info
- Already-purchased leads show full contact details
- New edge function: `create-lead-checkout` — creates Stripe checkout session
- New edge function: `stripe-lead-webhook` — handles payment confirmation, inserts `lead_purchases`

**Files:** New edge functions, `src/components/clinic-panel/ApplicationsTab.tsx`, `src/lib/services.ts`

### Feature 7: Admin Panel

**What changes:**
- New route: `/admin` — protected, only accessible by users with `admin` role
- Create admin account for `info@dentalturkey.clinic` with `admin` role in `user_roles`
- Admin panel sections:
  1. **Clinics**: List all registered clinics, edit any field, set billing type (Paid/Free)
  2. **Pending Approvals**: List clinics awaiting approval, approve/reject with reason
  3. **Patients**: View all leads across all clinics
  4. **Billing**: View purchase history, revenue

**Files:** New pages `src/pages/Admin.tsx`, `src/pages/AdminClinics.tsx`, `src/pages/AdminApprovals.tsx`

---

## New Routes

| Route | Page | Access |
|-------|------|--------|
| `/admin` | Admin Dashboard | admin role only |
| `/admin/clinics` | Manage all clinics | admin role only |
| `/admin/approvals` | Pending clinic approvals | admin role only |
| `/admin/approve-clinic` | Email approval action page | token-based |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `send-approval-request` | Sends approval email to admin on clinic signup |
| `clinic-approval-action` | Generates/validates approval tokens |
| `create-lead-checkout` | Creates Stripe checkout for lead purchases |
| `stripe-lead-webhook` | Handles Stripe payment success, unlocks leads |

---

## Implementation Order

Due to the scope, this should be built in this order:

1. **Database migrations** — all new tables, columns, RLS policies, storage bucket
2. **Clinic registration redesign** — document uploads, approval status
3. **Approval email flow** — edge function + admin approval page
4. **Admin panel** — clinic management, billing type toggle
5. **Lead masking & purchase flow** — hide contacts, Stripe checkout
6. **Dashboard redesign** — one clinic per account, professional layout

---

## Technical Notes

- Stripe will be enabled via the Lovable Stripe integration tool (handles secret key collection automatically)
- Approval emails will use Lovable's built-in transactional email system (requires email domain setup)
- Admin role for `info@dentalturkey.clinic` will be inserted via SQL after account creation
- Lead contact masking is done client-side based on `lead_purchases` join — if no purchase record exists for that clinic+lead combo, contacts are masked
- The existing `contact_requests` table already captures all needed patient data — no new "patients" table needed, just a UI rename and access control layer

