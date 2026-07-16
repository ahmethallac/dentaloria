ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS google_reviews jsonb NOT NULL DEFAULT '[]'::jsonb;
