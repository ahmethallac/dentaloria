-- Create a public view of clinics that excludes sensitive contact information
CREATE VIEW public.clinics_public AS 
SELECT 
  id,
  name,
  description,
  address, -- Keep address as it's needed for location display
  city_id,
  rating,
  review_count,
  is_verified,
  is_featured,
  created_at,
  experience_years,
  patient_count,
  latitude,
  longitude,
  trustpilot_rating,
  website -- Keep website as it's meant to be public
FROM public.clinics;

-- Grant access to the public view
GRANT SELECT ON public.clinics_public TO anon;
GRANT SELECT ON public.clinics_public TO authenticated;

-- Update the main clinics table RLS policy to restrict public access
DROP POLICY IF EXISTS "Public read access for clinics" ON public.clinics;

-- Create new restrictive policies for the main clinics table
CREATE POLICY "Authenticated users can read all clinic data" 
ON public.clinics 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Clinic owners can read their own clinic data" 
ON public.clinics 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow public access only to basic clinic info through the view
-- The view automatically restricts what fields are accessible