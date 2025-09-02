-- Fix security issue: Remove overly permissive policy that allows all authenticated users to read sensitive clinic data
-- This ensures only clinic owners can access their own sensitive information (phone, email, etc.)
-- Public users will continue to use the clinics_public table for non-sensitive data

DROP POLICY IF EXISTS "Authenticated users can read all clinic data" ON public.clinics;

-- The remaining policies are:
-- 1. "Clinic owners can read their own clinic data" - allows clinic owners to manage their data
-- 2. "Clinic admins can create clinics" - allows creating new clinics
-- 3. "Clinic admins can update their own clinics" - allows updating own clinics
-- 
-- Public users will access clinic data through the clinics_public table which contains
-- only non-sensitive information and has proper public read access policies