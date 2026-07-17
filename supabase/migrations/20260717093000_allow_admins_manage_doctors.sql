-- Super Admins manage clinics on the clinic owner's behalf from /admin, but
-- the "doctors" policy only ever checked clinics.user_id = auth.uid(),
-- unlike clinic_videos which already allows admins via has_role(). Bring
-- doctors in line with that pattern.
ALTER POLICY "Clinic admins can manage doctors" ON public.doctors
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = doctors.clinic_id AND clinics.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = doctors.clinic_id AND clinics.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );
