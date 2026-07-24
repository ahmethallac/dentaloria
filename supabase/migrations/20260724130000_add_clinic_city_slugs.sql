-- Permanent, human-readable clinic URLs: /clinic/:citySlug/:clinicSlug.
-- Slugs are generated once (Turkish-char-aware) and then never silently
-- changed by a later name edit, so links stay permanent.

CREATE OR REPLACE FUNCTION public.slugify(input text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(translate(input, 'İĞÜŞÖÇığüşöç', 'IGUSOCigusoc')),
      '[^a-z0-9]+', '-', 'g'
    )
  )
$$;

ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.clinics_public ADD COLUMN IF NOT EXISTS slug text;

-- Backfill existing cities.
UPDATE public.cities SET slug = public.slugify(name) WHERE slug IS NULL;

-- Backfill existing clinics, with a collision-suffix loop (global uniqueness).
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR r IN SELECT id, COALESCE(display_name, name) AS name FROM public.clinics WHERE slug IS NULL LOOP
    base := public.slugify(r.name);
    IF base = '' THEN base := 'clinic'; END IF;
    candidate := base;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = candidate AND id <> r.id) LOOP
      suffix := suffix + 1;
      candidate := base || '-' || suffix;
    END LOOP;
    UPDATE public.clinics SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.cities ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.clinics ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cities_slug_key ON public.cities(slug);
CREATE UNIQUE INDEX IF NOT EXISTS clinics_slug_key ON public.clinics(slug);

-- Auto-fill slug for future city inserts (cities are admin-managed, rarely inserted).
CREATE OR REPLACE FUNCTION public.cities_set_slug() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF new.slug IS NULL OR new.slug = '' THEN
    new.slug := public.slugify(new.name);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_cities_set_slug ON public.cities;
CREATE TRIGGER trg_cities_set_slug
  BEFORE INSERT OR UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.cities_set_slug();

-- Auto-fill slug for every future clinic insert (register-clinic and any other
-- path), with the same collision-suffix loop as the backfill above. Once a
-- slug is set it is never recomputed, so editing a clinic's name later does
-- not change its permanent URL.
CREATE OR REPLACE FUNCTION public.clinics_set_slug() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 1;
BEGIN
  IF new.slug IS NOT NULL AND new.slug <> '' THEN
    RETURN new;
  END IF;

  base := public.slugify(COALESCE(new.display_name, new.name));
  IF base = '' THEN base := 'clinic'; END IF;
  candidate := base;

  WHILE EXISTS (SELECT 1 FROM public.clinics WHERE slug = candidate AND id <> new.id) LOOP
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  END LOOP;

  new.slug := candidate;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_clinics_set_slug ON public.clinics;
CREATE TRIGGER trg_clinics_set_slug
  BEFORE INSERT OR UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.clinics_set_slug();

-- Carry slug through into the public mirror.
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
      website, name, description, address, balance_cents, languages, facilities, homepage_showcase,
      google_reviews, slug
    ) VALUES (
      new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
      new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
      new.website, COALESCE(new.display_name, new.name), new.description, new.address, COALESCE(v_balance, 0),
      COALESCE(new.languages, '{}'), COALESCE(new.facilities, '{}'), COALESCE(new.homepage_showcase, false),
      COALESCE(new.google_reviews, '[]'::jsonb), new.slug
    )
    ON CONFLICT (id) DO UPDATE SET
      city_id = excluded.city_id, rating = excluded.rating, review_count = excluded.review_count,
      is_verified = excluded.is_verified, is_featured = excluded.is_featured, created_at = excluded.created_at,
      experience_years = excluded.experience_years, patient_count = excluded.patient_count,
      latitude = excluded.latitude, longitude = excluded.longitude, trustpilot_rating = excluded.trustpilot_rating,
      website = excluded.website, name = excluded.name, description = excluded.description,
      address = excluded.address, balance_cents = excluded.balance_cents,
      languages = excluded.languages, facilities = excluded.facilities,
      homepage_showcase = excluded.homepage_showcase,
      google_reviews = excluded.google_reviews,
      slug = excluded.slug;
  ELSE
    DELETE FROM public.clinics_public WHERE id = new.id;
  END IF;

  RETURN new;
END; $function$;

-- Backfill clinics_public rows for already-live clinics (trigger only fires on future writes).
UPDATE public.clinics_public cp
SET slug = c.slug
FROM public.clinics c
WHERE cp.id = c.id;
