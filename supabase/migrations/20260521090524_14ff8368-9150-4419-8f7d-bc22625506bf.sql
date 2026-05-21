ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS homepage_showcase boolean NOT NULL DEFAULT false;
ALTER TABLE public.clinics_public ADD COLUMN IF NOT EXISTS homepage_showcase boolean NOT NULL DEFAULT false;

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
      website, name, description, address, balance_cents, languages, facilities, homepage_showcase
    ) VALUES (
      new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
      new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
      new.website, COALESCE(new.display_name, new.name), new.description, new.address, COALESCE(v_balance, 0),
      COALESCE(new.languages, '{}'), COALESCE(new.facilities, '{}'), COALESCE(new.homepage_showcase, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      city_id = excluded.city_id, rating = excluded.rating, review_count = excluded.review_count,
      is_verified = excluded.is_verified, is_featured = excluded.is_featured, created_at = excluded.created_at,
      experience_years = excluded.experience_years, patient_count = excluded.patient_count,
      latitude = excluded.latitude, longitude = excluded.longitude, trustpilot_rating = excluded.trustpilot_rating,
      website = excluded.website, name = excluded.name, description = excluded.description,
      address = excluded.address, balance_cents = excluded.balance_cents,
      languages = excluded.languages, facilities = excluded.facilities,
      homepage_showcase = excluded.homepage_showcase;
  ELSE
    DELETE FROM public.clinics_public WHERE id = new.id;
  END IF;

  RETURN new;
END; $function$;

-- Backfill any existing published rows
UPDATE public.clinics_public cp
SET homepage_showcase = c.homepage_showcase
FROM public.clinics c
WHERE cp.id = c.id;

CREATE INDEX IF NOT EXISTS idx_clinics_public_homepage_showcase
  ON public.clinics_public (homepage_showcase) WHERE homepage_showcase = true;