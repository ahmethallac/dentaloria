
-- 1) contact_requests tablosuna alanlar
ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2) İndeksler
CREATE INDEX IF NOT EXISTS idx_contact_requests_clinic_id_created_at
  ON public.contact_requests (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status
  ON public.contact_requests (status);

-- 3) updated_at tetikleyicisi
DROP TRIGGER IF EXISTS contact_requests_set_updated_at ON public.contact_requests;
CREATE TRIGGER contact_requests_set_updated_at
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS: Klinik sahibi kendi başvurularını görebilsin ve güncelleyebilsin
-- SELECT
CREATE POLICY "Clinic admins can view their contact requests"
  ON public.contact_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = contact_requests.clinic_id
        AND c.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Clinic admins can update their contact requests"
  ON public.contact_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = contact_requests.clinic_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = contact_requests.clinic_id
        AND c.user_id = auth.uid()
    )
  );

-- 5) clinic_images için Update/Delete RLS
CREATE POLICY "Clinic admins can update clinic images"
  ON public.clinic_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = clinic_images.clinic_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = clinic_images.clinic_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic admins can delete clinic images"
  ON public.clinic_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.clinics c
      WHERE c.id = clinic_images.clinic_id
        AND c.user_id = auth.uid()
    )
  );
