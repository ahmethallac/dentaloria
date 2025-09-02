-- STORAGE SECURITY FIXES - Fix overly permissive policies

-- First, let's see what storage policies currently exist and fix them
-- Remove overly permissive policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload doctor images" ON storage.objects;

-- Create secure storage policies for clinic-images bucket
CREATE POLICY "Clinic owners can upload their clinic images"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'clinic-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.user_id = auth.uid() 
    AND clinics.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Clinic owners can view their clinic images"
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'clinic-images' 
  AND (
    -- Public read for all clinic images (they're marked as public bucket)
    TRUE
  )
);

CREATE POLICY "Clinic owners can update their clinic images"
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'clinic-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE clinics.user_id = auth.uid() 
    AND clinics.id::text = (storage.foldername(name))[1]
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
    AND clinics.id::text = (storage.foldername(name))[1]
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
    AND d.id::text = (storage.foldername(name))[1]
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
    AND d.id::text = (storage.foldername(name))[1]
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
    AND d.id::text = (storage.foldername(name))[1]
  )
);

-- Fix function search paths (addresses linter warning)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'patient')
  );
  RETURN NEW;
END;
$$;