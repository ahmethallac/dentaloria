-- Outreach campaigns: the invite's language, the contacts we found for the
-- clinic, what was sent, and the message templates the admin edits.
--
-- Everything per invite lives on clinic_approvals, next to the secret token it
-- belongs to, so rejecting (which deletes the clinic and cascades) leaves none
-- of it behind — only the suppression tombstone.

ALTER TABLE public.clinic_approvals
  -- Language of the approval screen (banner, Approve/Reject bar, signup) and of
  -- the invitation mail/WhatsApp text. NOT the clinic page itself, which
  -- follows the visitor's own site language.
  ADD COLUMN IF NOT EXISTS invite_locale text NOT NULL DEFAULT 'tr'
    CHECK (invite_locale IN ('tr', 'en')),
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_email_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_source text,
  ADD COLUMN IF NOT EXISTS contacts_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_send_error text;

-- One editable text per channel and language. {{clinic}} and {{link}} are
-- filled in per clinic when the mail or WhatsApp message is prepared.
CREATE TABLE IF NOT EXISTS public.outreach_templates (
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  locale text NOT NULL CHECK (locale IN ('tr', 'en')),
  subject text,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, locale)
);

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach templates"
  ON public.outreach_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
