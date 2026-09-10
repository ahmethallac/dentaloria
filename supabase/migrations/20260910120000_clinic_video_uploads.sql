-- Uploaded video files, alongside YouTube and Instagram embeds.
--
-- Clinics can now upload an MP4 from their panel, and the collector copies a
-- source clinic's own videos in the same way. Both land in the clinic-videos
-- bucket under a folder named after the clinic id, which is what the storage
-- policies below check ownership against.

-- 1. Allow provider = 'file'. The original check was declared inline on the
--    column, so its generated name is looked up rather than assumed.
DO $$
DECLARE existing text;
BEGIN
  SELECT conname INTO existing
  FROM pg_constraint
  WHERE conrelid = 'public.clinic_videos'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%provider%';
  IF existing IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.clinic_videos DROP CONSTRAINT %I', existing);
  END IF;
END $$;

ALTER TABLE public.clinic_videos ADD CONSTRAINT clinic_videos_provider_check
  CHECK (provider IN ('youtube', 'instagram', 'file'));

-- 2. The bucket. Public, so the clinic page can play a file straight from its
--    URL. The 50 MB ceiling matches MAX_VIDEO_BYTES in src/lib/videoUtils.ts
--    and the importer, so a too-large file is refused before it is uploaded.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clinic-videos', 'clinic-videos', true, 52428800,
        ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Who may write. No public SELECT policy on purpose: playback goes through
--    the public URL and needs none, while a listing policy would let anyone
--    enumerate folders and see which draft clinics exist.
CREATE POLICY "Clinic owners and admins can list clinic videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinic-videos' AND (
      EXISTS (SELECT 1 FROM public.clinics c
              WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Clinic owners and admins can upload clinic videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-videos' AND (
      EXISTS (SELECT 1 FROM public.clinics c
              WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Clinic owners and admins can delete clinic videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-videos' AND (
      EXISTS (SELECT 1 FROM public.clinics c
              WHERE c.id::text = (storage.foldername(name))[1] AND c.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
