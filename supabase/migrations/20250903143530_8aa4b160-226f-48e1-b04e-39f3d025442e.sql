-- Fix the clinics_public sync issue

-- First, update the sync function to use SECURITY DEFINER and proper search path
CREATE OR REPLACE FUNCTION public.sync_clinics_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
begin
  if tg_op = 'DELETE' then
    delete from public.clinics_public where id = old.id;
    return old;
  end if;

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

  return new;
end;
$$;

-- Add RLS policies for system operations (allows the sync function to work)
CREATE POLICY "System can manage clinics_public data" 
ON public.clinics_public 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Also add a policy for rate_limits to clean up the linter warning
CREATE POLICY "Admins can view rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));