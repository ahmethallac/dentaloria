-- 1. Add soft-delete columns to clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_clinics_deleted_at ON public.clinics(deleted_at);

-- 2. Allow admins to permanently delete clinics
DROP POLICY IF EXISTS "Admins can delete clinics" ON public.clinics;
CREATE POLICY "Admins can delete clinics"
ON public.clinics
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Update sync_clinics_public so trashed clinics disappear from public view
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

  if new.is_published = true and new.deleted_at is null then
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

-- Ensure trigger exists
DROP TRIGGER IF EXISTS clinics_sync_public ON public.clinics;
CREATE TRIGGER clinics_sync_public
AFTER INSERT OR UPDATE OR DELETE ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.sync_clinics_public();

-- 4. Add ON DELETE CASCADE foreign keys so hard-deleting a clinic cleans up children
DO $$
BEGIN
  -- clinic_images
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinic_images_clinic_id_fkey') THEN
    ALTER TABLE public.clinic_images DROP CONSTRAINT clinic_images_clinic_id_fkey;
  END IF;
  ALTER TABLE public.clinic_images
    ADD CONSTRAINT clinic_images_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- clinic_treatments
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinic_treatments_clinic_id_fkey') THEN
    ALTER TABLE public.clinic_treatments DROP CONSTRAINT clinic_treatments_clinic_id_fkey;
  END IF;
  ALTER TABLE public.clinic_treatments
    ADD CONSTRAINT clinic_treatments_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- doctors
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'doctors_clinic_id_fkey') THEN
    ALTER TABLE public.doctors DROP CONSTRAINT doctors_clinic_id_fkey;
  END IF;
  ALTER TABLE public.doctors
    ADD CONSTRAINT doctors_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- contact_requests
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'contact_requests_clinic_id_fkey') THEN
    ALTER TABLE public.contact_requests DROP CONSTRAINT contact_requests_clinic_id_fkey;
  END IF;
  ALTER TABLE public.contact_requests
    ADD CONSTRAINT contact_requests_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- clinic_billing_settings
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinic_billing_settings_clinic_id_fkey') THEN
    ALTER TABLE public.clinic_billing_settings DROP CONSTRAINT clinic_billing_settings_clinic_id_fkey;
  END IF;
  ALTER TABLE public.clinic_billing_settings
    ADD CONSTRAINT clinic_billing_settings_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- clinic_approvals
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinic_approvals_clinic_id_fkey') THEN
    ALTER TABLE public.clinic_approvals DROP CONSTRAINT clinic_approvals_clinic_id_fkey;
  END IF;
  ALTER TABLE public.clinic_approvals
    ADD CONSTRAINT clinic_approvals_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

  -- lead_purchases
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lead_purchases_clinic_id_fkey') THEN
    ALTER TABLE public.lead_purchases DROP CONSTRAINT lead_purchases_clinic_id_fkey;
  END IF;
  ALTER TABLE public.lead_purchases
    ADD CONSTRAINT lead_purchases_clinic_id_fkey
    FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;
END $$;