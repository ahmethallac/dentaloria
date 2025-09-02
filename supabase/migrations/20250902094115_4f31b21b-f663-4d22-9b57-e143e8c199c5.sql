-- STORAGE RLS SECURITY FIXES (CORRECTED)
-- Fix overly permissive Storage policies

-- Update existing Storage policies to be more restrictive
-- 1. For clinic-images bucket - only allow clinic owners to upload/manage their own images
DROP POLICY IF EXISTS "clinic images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own clinic images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own clinic images" ON storage.objects;

-- Create more secure clinic-images policies
CREATE POLICY "Public read access for clinic images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'clinic-images');

CREATE POLICY "Clinic owners can upload images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can update their images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'clinic-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can delete their images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'clinic-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 2. For doctor-images bucket - only allow clinic owners to upload/manage doctor images
DROP POLICY IF EXISTS "doctor images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own doctor images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own doctor images" ON storage.objects;

-- Create more secure doctor-images policies  
CREATE POLICY "Public read access for doctor images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'doctor-images');

CREATE POLICY "Clinic owners can upload doctor images"
ON storage.objects  
FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.doctors d ON c.id = d.clinic_id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can update doctor images"
ON storage.objects
FOR UPDATE  
USING (
  bucket_id = 'doctor-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.doctors d ON c.id = d.clinic_id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Clinic owners can delete doctor images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'doctor-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.clinics c
    JOIN public.doctors d ON c.id = d.clinic_id
    WHERE c.user_id = auth.uid() 
    AND d.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 3. ADD ABUSE PREVENTION TABLES
-- Create table to track contact request submissions by IP/email
CREATE TABLE public.contact_request_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET,
    email TEXT,
    submissions_count INTEGER DEFAULT 1,
    last_submission TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tracking table
ALTER TABLE public.contact_request_tracking ENABLE ROW LEVEL SECURITY;

-- Only allow system/admin access to tracking table
CREATE POLICY "Only system can access tracking"
ON public.contact_request_tracking
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if submission is allowed (rate limiting)
CREATE OR REPLACE FUNCTION public.check_contact_submission_allowed(
    _ip_address INET,
    _email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ip_count INTEGER := 0;
    email_count INTEGER := 0;
    blocked_until_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check IP-based rate limiting (max 5 per hour)
    SELECT COUNT(*), MAX(blocked_until)
    INTO ip_count, blocked_until_time
    FROM contact_request_tracking 
    WHERE ip_address = _ip_address 
    AND last_submission > now() - INTERVAL '1 hour';
    
    -- Check if currently blocked
    IF blocked_until_time IS NOT NULL AND blocked_until_time > now() THEN
        RETURN FALSE;
    END IF;
    
    -- Check email-based rate limiting (max 3 per day)  
    SELECT COUNT(*)
    INTO email_count
    FROM contact_request_tracking
    WHERE email = _email
    AND last_submission > now() - INTERVAL '24 hours';
    
    -- Block if limits exceeded
    IF ip_count >= 5 OR email_count >= 3 THEN
        -- Update or insert blocking record
        INSERT INTO contact_request_tracking (ip_address, email, submissions_count, blocked_until)
        VALUES (_ip_address, _email, ip_count + 1, now() + INTERVAL '1 hour')
        ON CONFLICT ON CONSTRAINT contact_request_tracking_pkey DO UPDATE SET
            submissions_count = contact_request_tracking.submissions_count + 1,
            blocked_until = now() + INTERVAL '1 hour',
            last_submission = now();
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;