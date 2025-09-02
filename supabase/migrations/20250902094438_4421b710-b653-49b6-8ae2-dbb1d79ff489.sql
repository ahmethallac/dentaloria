-- STORAGE SECURITY FIXES - Fix column ambiguity issues

-- Remove any existing storage policies first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can upload their clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can view their clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can update their clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can delete their clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can upload doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view doctor images" ON storage.objects;  
DROP POLICY IF EXISTS "Clinic owners can update doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Clinic owners can delete doctor images" ON storage.objects;

-- Create secure storage policies for clinic-images bucket with explicit table references
CREATE POLICY "Clinic owners can upload their clinic images"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'clinic-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.user_id = auth.uid() 
    AND clinics.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Public can view clinic images"
ON storage.objects FOR SELECT 
USING (bucket_id = 'clinic-images');

CREATE POLICY "Clinic owners can update their clinic images"
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'clinic-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.user_id = auth.uid() 
    AND clinics.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can delete their clinic images"
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'clinic-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.user_id = auth.uid() 
    AND clinics.id::text = (storage.foldername(objects.name))[1]
  )
);

-- Create secure storage policies for doctor-images bucket
CREATE POLICY "Clinic owners can upload doctor images"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'doctor-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.clinics c ON d.clinic_id = c.id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Public can view doctor images"
ON storage.objects FOR SELECT 
USING (bucket_id = 'doctor-images');

CREATE POLICY "Clinic owners can update doctor images"
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'doctor-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.clinics c ON d.clinic_id = c.id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can delete doctor images"
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'doctor-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.clinics c ON d.clinic_id = c.id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(objects.name))[1]
  )
);

-- ADD ABUSE PREVENTION - Create rate limiting table
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    action TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(ip_address, action, window_start)
);

-- Enable RLS on rate_limits (only needed for admin access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Add contact request limits
ALTER TABLE public.contact_requests 
ADD COLUMN ip_address INET,
ADD COLUMN user_agent TEXT;