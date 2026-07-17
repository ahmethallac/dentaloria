-- The "Clinic admins can manage doctors" policy only had a USING clause,
-- which governs SELECT/UPDATE/DELETE visibility but not INSERT. Without an
-- explicit WITH CHECK, Postgres rejected every new dentist row with
-- "new row violates row-level security policy for table doctors".
ALTER POLICY "Clinic admins can manage doctors" ON public.doctors
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE clinics.id = doctors.clinic_id AND clinics.user_id = auth.uid()
    )
  );
