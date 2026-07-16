
CREATE TABLE public.clinic_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('youtube','instagram')),
  provider_id text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clinic_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_videos TO authenticated;
GRANT ALL ON public.clinic_videos TO service_role;

ALTER TABLE public.clinic_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view clinic videos"
  ON public.clinic_videos FOR SELECT
  USING (true);

CREATE POLICY "Clinic owners can insert videos"
  ON public.clinic_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clinic owners can update videos"
  ON public.clinic_videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clinic owners can delete videos"
  ON public.clinic_videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_clinic_videos_updated_at
  BEFORE UPDATE ON public.clinic_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clinic_videos_clinic_id ON public.clinic_videos(clinic_id, sort_order);
