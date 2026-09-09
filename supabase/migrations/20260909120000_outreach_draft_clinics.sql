-- Outreach drafts: clinic pages we build *before* the clinic has an account,
-- send to them on a secret link, and publish only once they approve AND prove
-- they are that clinic by verifying a work email.
--
-- Nothing here can leak a draft publicly: clinics_public (the only table anon
-- can read) is written by sync_clinics_public, which still requires
-- is_published = true AND page_status = 'live'. A draft is neither.

-- 1. A clinic can now exist without an owner account. The owner is attached
--    later, when the clinic signs up from the approval screen. Ownership
--    policies compare clinics.user_id = auth.uid(); NULL never matches, so an
--    unclaimed draft stays invisible to every clinic user. Admins still reach
--    it through has_role().
ALTER TABLE public.clinics ALTER COLUMN user_id DROP NOT NULL;

-- 2. A draft sits in its own page_status until the clinic answers, so it can
--    never be confused with 'pending_page_approval' (which means the opposite
--    direction: the clinic submitted, we review).
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_page_status_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_page_status_check
  CHECK (page_status IN ('incomplete','awaiting_clinic_approval','pending_page_approval','live'));

-- 3. The secret link, its expiry, and the consent record.
ALTER TABLE public.clinic_approvals
  ADD COLUMN IF NOT EXISTS preview_token text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  -- Consent evidence, captured when the clinic approves. This is the only
  -- record of who granted us the right to publish their content, so it is
  -- written once and never updated.
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consent_ip inet,
  ADD COLUMN IF NOT EXISTS consent_user_agent text,
  ADD COLUMN IF NOT EXISTS consent_email text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS clinic_approvals_preview_token_key
  ON public.clinic_approvals (preview_token) WHERE preview_token IS NOT NULL;

-- Drafts that were never answered get swept by the expiry job.
CREATE INDEX IF NOT EXISTS clinic_approvals_expires_at_idx
  ON public.clinic_approvals (expires_at) WHERE status = 'pending';

-- 4. Doctors state the year they graduated, not a hand-maintained experience
--    count, so "17 years of experience" stays correct without anyone editing
--    it every January. experience_years stays for rows entered before this.
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS graduation_year integer;

-- 5. Rejecting deletes the clinic row (and everything cascading off it), so
--    the only thing left behind is this tombstone. Without it the collector
--    would re-import the same clinic next week and mail someone who already
--    said no. Holds the minimum needed to recognise them again, nothing else.
CREATE TABLE IF NOT EXISTS public.outreach_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL,
  email text,
  website_domain text,
  source_url text,
  reason text NOT NULL DEFAULT 'clinic_rejected',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;

-- Only staff ever read this list; the edge functions write it via the service
-- role, which bypasses RLS.
CREATE POLICY "Admins can manage suppressions"
  ON public.outreach_suppressions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS outreach_suppressions_email_idx
  ON public.outreach_suppressions (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_suppressions_domain_idx
  ON public.outreach_suppressions (lower(website_domain)) WHERE website_domain IS NOT NULL;
