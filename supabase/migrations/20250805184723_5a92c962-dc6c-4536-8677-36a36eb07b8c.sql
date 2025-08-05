-- Create auth user for testing
-- Note: This should be done through Supabase Auth signup, not directly in auth.users
-- Let's first check if the profile we created exists

SELECT id, full_name, user_type FROM public.profiles WHERE full_name = 'Dr. Mehmet Özkan';