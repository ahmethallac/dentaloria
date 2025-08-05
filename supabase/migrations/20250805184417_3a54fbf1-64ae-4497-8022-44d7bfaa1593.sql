-- Remove clinics without user_id (no owner)
DELETE FROM public.clinic_treatments WHERE clinic_id IN (
  SELECT id FROM public.clinics WHERE user_id IS NULL
);

DELETE FROM public.clinic_images WHERE clinic_id IN (
  SELECT id FROM public.clinics WHERE user_id IS NULL
);

DELETE FROM public.reviews WHERE clinic_id IN (
  SELECT id FROM public.clinics WHERE user_id IS NULL
);

DELETE FROM public.contact_requests WHERE clinic_id IN (
  SELECT id FROM public.clinics WHERE user_id IS NULL
);

DELETE FROM public.clinics WHERE user_id IS NULL;

-- Verify only Istanbul Dental Center remains
SELECT name, user_id FROM public.clinics;