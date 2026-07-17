-- clinic_images
ALTER POLICY "Clinic admins can upload images" ON public.clinic_images
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_images.clinic_id AND clinics.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER POLICY "Clinic admins can update clinic images" ON public.clinic_images
  USING (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER POLICY "Clinic admins can delete clinic images" ON public.clinic_images
  USING (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- clinic_before_after_images
ALTER POLICY "Clinic admins can insert before_after" ON public.clinic_before_after_images
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER POLICY "Clinic admins can update before_after" ON public.clinic_before_after_images
  USING (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

ALTER POLICY "Clinic admins can delete before_after" ON public.clinic_before_after_images
  USING (
    EXISTS (SELECT 1 FROM clinics c WHERE c.id = clinic_before_after_images.clinic_id AND c.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- clinic_treatments
ALTER POLICY "Clinic admins can manage clinic treatments" ON public.clinic_treatments
  USING (
    EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_treatments.clinic_id AND clinics.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clinics WHERE clinics.id = clinic_treatments.clinic_id AND clinics.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
