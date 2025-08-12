
-- 1) Yetkiler (olası eksik durumları güvenli şekilde tamamlar)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.contact_requests TO anon, authenticated;

-- 2) INSERT politikasını net şekilde tanımla (herkese izin ver)
DROP POLICY IF EXISTS "Anyone can create contact requests" ON public.contact_requests;

CREATE POLICY "Anyone can create contact requests"
  ON public.contact_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
