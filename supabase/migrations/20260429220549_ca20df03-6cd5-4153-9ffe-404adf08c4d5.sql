-- 1. Add languages and facilities arrays to clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}';

-- 2. Add the same columns on the public mirror
ALTER TABLE public.clinics_public
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS facilities text[] NOT NULL DEFAULT '{}';

-- 3. Update sync function to copy these new columns
CREATE OR REPLACE FUNCTION public.sync_clinics_public()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance integer;
BEGIN
  IF tg_op = 'DELETE' THEN
    DELETE FROM public.clinics_public WHERE id = old.id;
    RETURN old;
  END IF;

  IF new.is_published = true
     AND new.deleted_at IS NULL
     AND new.approval_status = 'approved'
     AND new.page_status = 'live' THEN

    SELECT COALESCE(balance_cents, 0) INTO v_balance
    FROM public.clinic_balances WHERE clinic_id = new.id;

    INSERT INTO public.clinics_public (
      id, city_id, rating, review_count, is_verified, is_featured, created_at,
      experience_years, patient_count, latitude, longitude, trustpilot_rating,
      website, name, description, address, balance_cents, languages, facilities
    ) VALUES (
      new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
      new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
      new.website, COALESCE(new.display_name, new.name), new.description, new.address, COALESCE(v_balance, 0),
      COALESCE(new.languages, '{}'), COALESCE(new.facilities, '{}')
    )
    ON CONFLICT (id) DO UPDATE SET
      city_id = excluded.city_id, rating = excluded.rating, review_count = excluded.review_count,
      is_verified = excluded.is_verified, is_featured = excluded.is_featured, created_at = excluded.created_at,
      experience_years = excluded.experience_years, patient_count = excluded.patient_count,
      latitude = excluded.latitude, longitude = excluded.longitude, trustpilot_rating = excluded.trustpilot_rating,
      website = excluded.website, name = excluded.name, description = excluded.description,
      address = excluded.address, balance_cents = excluded.balance_cents,
      languages = excluded.languages, facilities = excluded.facilities;
  ELSE
    DELETE FROM public.clinics_public WHERE id = new.id;
  END IF;

  RETURN new;
END; $function$;

-- 4. Backfill clinics_public for already-live clinics
UPDATE public.clinics_public cp
SET languages = COALESCE(c.languages, '{}'),
    facilities = COALESCE(c.facilities, '{}')
FROM public.clinics c
WHERE c.id = cp.id;

-- 5. Before & after photos table
CREATE TABLE IF NOT EXISTS public.clinic_before_after_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_before_after_clinic
  ON public.clinic_before_after_images(clinic_id);

ALTER TABLE public.clinic_before_after_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for before_after" ON public.clinic_before_after_images;
CREATE POLICY "Public read access for before_after"
  ON public.clinic_before_after_images
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Clinic admins can insert before_after" ON public.clinic_before_after_images;
CREATE POLICY "Clinic admins can insert before_after"
  ON public.clinic_before_after_images
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinic admins can update before_after" ON public.clinic_before_after_images;
CREATE POLICY "Clinic admins can update before_after"
  ON public.clinic_before_after_images
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinic admins can delete before_after" ON public.clinic_before_after_images;
CREATE POLICY "Clinic admins can delete before_after"
  ON public.clinic_before_after_images
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins manage all before_after" ON public.clinic_before_after_images;
CREATE POLICY "Admins manage all before_after"
  ON public.clinic_before_after_images
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));