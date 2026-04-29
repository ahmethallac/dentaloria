ALTER TABLE public.clinic_before_after_images
  ADD CONSTRAINT clinic_before_after_images_clinic_id_fkey
  FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;