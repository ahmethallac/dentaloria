ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS google_rating_synced_at timestamptz;
