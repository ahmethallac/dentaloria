-- Allow public (anon + authenticated) INSERT into clinic-documents/pending/* during registration.
-- Read/update/delete remain governed by existing restrictive policies.

DROP POLICY IF EXISTS "Public can upload pending registration docs" ON storage.objects;

CREATE POLICY "Public can upload pending registration docs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'clinic-documents'
  AND (storage.foldername(name))[1] = 'pending'
);