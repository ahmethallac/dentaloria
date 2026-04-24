-- Add display_name to clinics for separating legal name from public-facing name
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS display_name text;

-- Update sync_clinics_public to use display_name (fallback to legal name) for the public name
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
      new.website, COALESCE(new.display_name, new.name), new.description, new.address
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