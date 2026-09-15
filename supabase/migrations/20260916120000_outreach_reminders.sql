-- Reminder mails: the second (and third) nudge to a clinic that was invited
-- once and never answered.
--
-- The first invite is a one-off — invite_sent_at is set once and the panel
-- refuses to send it twice, which is what stops a fresh listing run from
-- mailing the same clinic again. Reminders are deliberately the opposite:
-- they are countable and repeatable, so they live in their own columns rather
-- than overwriting the record of when we first made contact.

ALTER TABLE public.clinic_approvals
  ADD COLUMN IF NOT EXISTS invite_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_reminder_count integer NOT NULL DEFAULT 0;

-- The reminder has its own editable text, so 'email_reminder' joins the
-- channels. The original CHECK is dropped by lookup rather than by name: it
-- was created inline with the table and its name is Postgres's to choose.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.outreach_templates'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%channel%'
  LOOP
    EXECUTE format('ALTER TABLE public.outreach_templates DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.outreach_templates
  ADD CONSTRAINT outreach_templates_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'email_reminder'));
