-- Captures which site locale the registrant was browsing in when they
-- submitted the clinic registration form, so transactional emails to that
-- clinic (application received/approved/rejected, page approved/rejected)
-- can be sent in the same language rather than always English.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';
