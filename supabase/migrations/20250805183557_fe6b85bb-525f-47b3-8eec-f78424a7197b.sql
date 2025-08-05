-- Add more sample clinics for a realistic platform

-- Clinic 2: Antalya Hair Clinic
WITH antalya_clinic AS (
  INSERT INTO public.clinics (
    name,
    description,
    address,
    city_id,
    phone,
    email,
    website,
    experience_years,
    patient_count,
    rating,
    review_count,
    is_verified,
    is_featured
  ) VALUES (
    'Antalya Hair Transplant Center',
    'Leading hair transplant clinic in Antalya specializing in FUE and DHI techniques. We have performed over 5000 successful hair transplant procedures.',
    'Lara Mahallesi, Güzeloba Caddesi No: 456, Muratpaşa, Antalya',
    (SELECT id FROM public.cities WHERE name = 'Antalya' LIMIT 1),
    '+90 242 555 0456',
    'info@antalyahair.com',
    'https://www.antalyahair.com',
    8,
    5000,
    4.9,
    320,
    true,
    true
  )
  RETURNING id
)
-- Add clinic images for Antalya clinic
INSERT INTO public.clinic_images (clinic_id, image_url, is_primary)
SELECT 
  antalya_clinic.id,
  image_url,
  is_primary
FROM antalya_clinic,
(VALUES 
  ('https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800', true),
  ('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800', false)
) AS images(image_url, is_primary);

-- Add hair transplant treatments to Antalya clinic
WITH antalya_clinic AS (
  SELECT id FROM public.clinics WHERE name = 'Antalya Hair Transplant Center'
),
hair_treatments AS (
  SELECT t.id FROM public.treatments t
  JOIN public.treatment_categories tc ON t.category_id = tc.id
  WHERE tc.name = 'Hair Transplant'
)
INSERT INTO public.clinic_treatments (clinic_id, treatment_id, price)
SELECT 
  antalya_clinic.id,
  hair_treatments.id,
  CASE 
    WHEN random() < 0.5 THEN 2000
    ELSE 2500
  END
FROM antalya_clinic, hair_treatments;

-- Clinic 3: London Plastic Surgery
WITH london_clinic AS (
  INSERT INTO public.clinics (
    name,
    description,
    address,
    city_id,
    phone,
    email,
    website,
    experience_years,
    patient_count,
    rating,
    review_count,
    is_verified,
    is_featured
  ) VALUES (
    'London Aesthetic Clinic',
    'Premier plastic surgery clinic in Central London offering world-class cosmetic procedures with internationally acclaimed surgeons.',
    '123 Harley Street, Marylebone, London W1G 6BA',
    (SELECT id FROM public.cities WHERE name = 'London' LIMIT 1),
    '+44 20 7123 4567',
    'info@londonaesthetic.co.uk',
    'https://www.londonaesthetic.co.uk',
    15,
    1800,
    4.7,
    95,
    true,
    false
  )
  RETURNING id
)
-- Add clinic images for London clinic
INSERT INTO public.clinic_images (clinic_id, image_url, is_primary)
SELECT 
  london_clinic.id,
  image_url,
  is_primary
FROM london_clinic,
(VALUES 
  ('https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800', true),
  ('https://images.unsplash.com/photo-1527576539890-dfa815648363?w=800', false)
) AS images(image_url, is_primary);

-- Add plastic surgery treatments to London clinic
WITH london_clinic AS (
  SELECT id FROM public.clinics WHERE name = 'London Aesthetic Clinic'
),
plastic_treatments AS (
  SELECT t.id FROM public.treatments t
  JOIN public.treatment_categories tc ON t.category_id = tc.id
  WHERE tc.name = 'Plastic Surgery'
)
INSERT INTO public.clinic_treatments (clinic_id, treatment_id, price)
SELECT 
  london_clinic.id,
  plastic_treatments.id,
  CASE 
    WHEN random() < 0.3 THEN 5000
    WHEN random() < 0.6 THEN 7000
    ELSE 9000
  END
FROM london_clinic, plastic_treatments;

-- Clinic 4: Izmir Eye Center
WITH izmir_clinic AS (
  INSERT INTO public.clinics (
    name,
    description,
    address,
    city_id,
    phone,
    email,
    website,
    experience_years,
    patient_count,
    rating,
    review_count,
    is_verified,
    is_featured
  ) VALUES (
    'Izmir Vision Center',
    'Advanced eye care facility offering LASIK surgery and comprehensive ophthalmology services with state-of-the-art equipment.',
    'Alsancak Mahallesi, Kıbrıs Şehitleri Caddesi No: 789, Konak, İzmir',
    (SELECT id FROM public.cities WHERE name = 'Izmir' LIMIT 1),
    '+90 232 555 0789',
    'info@izmirvision.com',
    'https://www.izmirvision.com',
    10,
    3200,
    4.6,
    180,
    true,
    false
  )
  RETURNING id
)
-- Add clinic images for Izmir clinic
INSERT INTO public.clinic_images (clinic_id, image_url, is_primary)
SELECT 
  izmir_clinic.id,
  image_url,
  is_primary
FROM izmir_clinic,
(VALUES 
  ('https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800', true),
  ('https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800', false)
) AS images(image_url, is_primary);

-- Add eye surgery treatments to Izmir clinic
WITH izmir_clinic AS (
  SELECT id FROM public.clinics WHERE name = 'Izmir Vision Center'
),
eye_treatments AS (
  SELECT t.id FROM public.treatments t
  JOIN public.treatment_categories tc ON t.category_id = tc.id
  WHERE tc.name = 'Eye Surgery'
)
INSERT INTO public.clinic_treatments (clinic_id, treatment_id, price)
SELECT 
  izmir_clinic.id,
  eye_treatments.id,
  CASE 
    WHEN random() < 0.5 THEN 1500
    ELSE 2000
  END
FROM izmir_clinic, eye_treatments;

-- Add reviews for new clinics
INSERT INTO public.reviews (clinic_id, reviewer_name, rating, comment)
SELECT clinic_id, reviewer_name, rating, comment
FROM (
  SELECT 
    (SELECT id FROM public.clinics WHERE name = 'Antalya Hair Transplant Center') as clinic_id,
    'John Smith' as reviewer_name,
    5 as rating,
    'Excellent hair transplant results! The team was professional and the facilities were top-notch.' as comment
  UNION ALL
  SELECT 
    (SELECT id FROM public.clinics WHERE name = 'London Aesthetic Clinic'),
    'Emma Thompson',
    5,
    'Outstanding service and results. Dr. Williams is truly skilled and the staff made me feel comfortable throughout.'
  UNION ALL
  SELECT 
    (SELECT id FROM public.clinics WHERE name = 'Izmir Vision Center'),
    'David Wilson',
    4,
    'Great LASIK experience. Vision is perfect now and the recovery was quick. Highly recommend!'
) as review_data;