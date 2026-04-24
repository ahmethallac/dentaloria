-- Add page_status to clinics for the two-stage approval flow
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS page_status text NOT NULL DEFAULT 'incomplete';

ALTER TABLE public.clinics
  DROP CONSTRAINT IF EXISTS clinics_page_status_check;
ALTER TABLE public.clinics
  ADD CONSTRAINT clinics_page_status_check
  CHECK (page_status IN ('incomplete','pending_page_approval','live'));

-- Backfill: any clinic that was already approved + published before this change
-- should remain visible. Mark them as 'live'.
UPDATE public.clinics
SET page_status = 'live'
WHERE approval_status = 'approved'
  AND is_published = true
  AND deleted_at IS NULL
  AND page_status = 'incomplete';

-- Track healthcare-facility flag on the application
ALTER TABLE public.clinic_approvals
  ADD COLUMN IF NOT EXISTS applied_as_healthcare_facility boolean NOT NULL DEFAULT false;

-- Update sync_clinics_public so a clinic only appears publicly when page_status = 'live'
CREATE OR REPLACE FUNCTION public.sync_clinics_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    delete from public.clinics_public where id = old.id;
    return old;
  end if;

  if new.is_published = true
     and new.deleted_at is null
     and new.approval_status = 'approved'
     and new.page_status = 'live' then
    insert into public.clinics_public (
      id, city_id, rating, review_count, is_verified, is_featured, created_at,
      experience_years, patient_count, latitude, longitude, trustpilot_rating,
      website, name, description, address
    )
    values (
      new.id, new.city_id, new.rating, new.review_count, new.is_verified, new.is_featured, new.created_at,
      new.experience_years, new.patient_count, new.latitude, new.longitude, new.trustpilot_rating,
      new.website, new.name, new.description, new.address
    )
    on conflict (id) do update set
      city_id          = excluded.city_id,
      rating           = excluded.rating,
      review_count     = excluded.review_count,
      is_verified      = excluded.is_verified,
      is_featured      = excluded.is_featured,
      created_at       = excluded.created_at,
      experience_years = excluded.experience_years,
      patient_count    = excluded.patient_count,
      latitude         = excluded.latitude,
      longitude        = excluded.longitude,
      trustpilot_rating= excluded.trustpilot_rating,
      website          = excluded.website,
      name             = excluded.name,
      description      = excluded.description,
      address          = excluded.address;
  else
    delete from public.clinics_public where id = new.id;
  end if;

  return new;
end;
$function$;

-- Re-trigger the sync for every existing clinic so clinics_public matches the new rule
UPDATE public.clinics SET updated_at = now();