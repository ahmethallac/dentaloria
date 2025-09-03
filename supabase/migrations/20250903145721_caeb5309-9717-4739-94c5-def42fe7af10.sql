-- Add published status to clinics table
ALTER TABLE public.clinics 
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;

-- Update existing clinics to be published (for backward compatibility)
UPDATE public.clinics SET is_published = true;

-- Add email_verified tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- Update the sync function to include is_published
CREATE OR REPLACE FUNCTION public.sync_clinics_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    delete from public.clinics_public where id = old.id;
    return old;
  end if;

  -- Only sync published clinics to public view
  if new.is_published = true then
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
    -- Remove from public view if unpublished
    delete from public.clinics_public where id = new.id;
  end if;

  return new;
end;
$function$;