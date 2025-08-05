-- Fix Dr. Mehmet Özkan login issue by recreating user properly

-- First, delete the existing problematic user and related data
DELETE FROM public.profiles WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Update Istanbul Dental Center to be unassigned temporarily
UPDATE public.clinics 
SET user_id = NULL 
WHERE name = 'Istanbul Dental Center';

-- Create a proper user through a function that mimics the signup process
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Insert into profiles table (this will be the correct user)
    INSERT INTO public.profiles (id, full_name, user_type)
    VALUES (new_user_id, 'Dr. Mehmet Özkan', 'clinic_admin');
    
    -- Update Istanbul Dental Center to belong to this profile
    UPDATE public.clinics 
    SET user_id = new_user_id
    WHERE name = 'Istanbul Dental Center';
    
    -- Log the new user ID for reference
    RAISE NOTICE 'Created new profile with ID: %', new_user_id;
END $$;