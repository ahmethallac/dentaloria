-- Insert sample treatment categories
INSERT INTO public.treatment_categories (name, description) VALUES 
('Dental Care', 'Comprehensive dental treatments and oral health services'),
('Plastic Surgery', 'Aesthetic and reconstructive surgical procedures'),
('Hair Transplant', 'Hair restoration and transplantation services'),
('Eye Surgery', 'Vision correction and eye care procedures'),
('Orthopedics', 'Bone, joint, and muscle treatments')
ON CONFLICT DO NOTHING;

-- Insert sample treatments
WITH categories AS (
  SELECT id, name FROM public.treatment_categories
)
INSERT INTO public.treatments (name, description, category_id, min_price, max_price)
SELECT treatment_name, treatment_desc, categories.id, min_p, max_p
FROM (VALUES 
  ('Dental Implant', 'Single tooth replacement with titanium implant', 'Dental Care', 800, 1500),
  ('Teeth Whitening', 'Professional teeth whitening treatment', 'Dental Care', 200, 400),
  ('Veneers', 'Porcelain veneers for smile makeover', 'Dental Care', 400, 800),
  ('Root Canal', 'Root canal treatment for infected teeth', 'Dental Care', 300, 600),
  
  ('Rhinoplasty', 'Nose reshaping surgery', 'Plastic Surgery', 2000, 4000),
  ('Breast Augmentation', 'Breast enhancement surgery', 'Plastic Surgery', 3000, 6000),
  ('Liposuction', 'Fat removal procedure', 'Plastic Surgery', 1500, 3500),
  ('Facelift', 'Facial rejuvenation surgery', 'Plastic Surgery', 4000, 8000),
  
  ('FUE Hair Transplant', 'Follicular Unit Extraction hair transplant', 'Hair Transplant', 1200, 3000),
  ('DHI Hair Transplant', 'Direct Hair Implantation technique', 'Hair Transplant', 1500, 3500),
  
  ('LASIK Surgery', 'Laser eye surgery for vision correction', 'Eye Surgery', 1000, 2500),
  ('Cataract Surgery', 'Cataract removal and lens replacement', 'Eye Surgery', 800, 2000),
  
  ('Knee Replacement', 'Total or partial knee joint replacement', 'Orthopedics', 5000, 12000),
  ('Hip Replacement', 'Hip joint replacement surgery', 'Orthopedics', 6000, 15000)
) AS treatments_data(treatment_name, treatment_desc, category_name, min_p, max_p)
JOIN categories ON categories.name = treatments_data.category_name
ON CONFLICT DO NOTHING;

-- Create a sample user in auth.users (simulating a real signup)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role,
  aud
) VALUES (
  '12345678-1234-1234-1234-123456789012',
  'dr.mehmet@istanbuldental.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Dr. Mehmet Özkan", "user_type": "clinic_admin"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create profile for the user (this should be created by trigger, but let's ensure it exists)
INSERT INTO public.profiles (id, full_name, user_type) VALUES (
  '12345678-1234-1234-1234-123456789012',
  'Dr. Mehmet Özkan',
  'clinic_admin'
) ON CONFLICT (id) DO NOTHING;

-- Create a sample clinic
WITH clinic_data AS (
  INSERT INTO public.clinics (
    id,
    name,
    description,
    address,
    city_id,
    phone,
    email,
    website,
    user_id,
    experience_years,
    patient_count,
    rating,
    review_count,
    is_verified,
    is_featured
  ) VALUES (
    gen_random_uuid(),
    'Istanbul Dental Center',
    'Modern dental clinic in the heart of Istanbul offering comprehensive dental care with latest technology. Our experienced team provides high-quality treatments in a comfortable environment.',
    'Nişantaşı Mahallesi, Teşvikiye Caddesi No: 123, Şişli, Istanbul',
    (SELECT id FROM public.cities WHERE name = 'Istanbul' LIMIT 1),
    '+90 212 555 0123',
    'info@istanbuldental.com',
    'https://www.istanbuldental.com',
    '12345678-1234-1234-1234-123456789012',
    12,
    2500,
    4.8,
    150,
    true,
    true
  )
  RETURNING id
)
-- Add clinic images
INSERT INTO public.clinic_images (clinic_id, image_url, is_primary)
SELECT 
  clinic_data.id,
  image_url,
  is_primary
FROM clinic_data,
(VALUES 
  ('https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800', true),
  ('https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800', false),
  ('https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800', false)
) AS images(image_url, is_primary);

-- Add clinic treatments
WITH clinic_data AS (
  SELECT id FROM public.clinics WHERE user_id = '12345678-1234-1234-1234-123456789012'
),
dental_treatments AS (
  SELECT t.id FROM public.treatments t
  JOIN public.treatment_categories tc ON t.category_id = tc.id
  WHERE tc.name = 'Dental Care'
)
INSERT INTO public.clinic_treatments (clinic_id, treatment_id, price)
SELECT 
  clinic_data.id,
  dental_treatments.id,
  CASE 
    WHEN random() < 0.5 THEN 1000
    ELSE 1500
  END
FROM clinic_data, dental_treatments;

-- Add some sample reviews
WITH clinic_data AS (
  SELECT id FROM public.clinics WHERE user_id = '12345678-1234-1234-1234-123456789012'
)
INSERT INTO public.reviews (clinic_id, reviewer_name, rating, comment)
SELECT 
  clinic_data.id,
  reviewer_name,
  rating,
  comment
FROM clinic_data,
(VALUES 
  ('Sarah Johnson', 5, 'Amazing service! Dr. Mehmet and his team were very professional. My dental implant procedure was painless and the results are perfect.'),
  ('Michael Brown', 5, 'Best dental clinic in Istanbul! Clean facilities, modern equipment, and excellent English-speaking staff.'),
  ('Emma Wilson', 4, 'Great experience with teeth whitening. The results exceeded my expectations. Highly recommended!'),
  ('James Davis', 5, 'Professional team, affordable prices, and top-quality treatment. Will definitely come back for other procedures.'),
  ('Lisa Anderson', 5, 'Dr. Özkan is an excellent dentist. My veneers look absolutely natural and beautiful. Thank you!')
) AS reviews_data(reviewer_name, rating, comment);

-- Add sample doctors
WITH clinic_data AS (
  SELECT id FROM public.clinics WHERE user_id = '12345678-1234-1234-1234-123456789012'
)
INSERT INTO public.doctors (clinic_id, name, specialization, experience_years, image_url)
SELECT 
  clinic_data.id,
  doctor_name,
  specialization,
  experience_years,
  image_url
FROM clinic_data,
(VALUES 
  ('Dr. Mehmet Özkan', 'Oral and Maxillofacial Surgery', 12, 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400'),
  ('Dr. Ayşe Yılmaz', 'Prosthodontics', 8, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400'),
  ('Dr. Can Demir', 'Orthodontics', 6, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400')
) AS doctors_data(doctor_name, specialization, experience_years, image_url);