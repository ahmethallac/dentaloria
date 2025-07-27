-- Insert initial data for countries
INSERT INTO public.countries (name, code, flag_url) VALUES
('Turkey', 'TR', '🇹🇷'),
('Thailand', 'TH', '🇹🇭'),
('Mexico', 'MX', '🇲🇽'),
('India', 'IN', '🇮🇳'),
('Poland', 'PL', '🇵🇱'),
('Hungary', 'HU', '🇭🇺'),
('Czech Republic', 'CZ', '🇨🇿'),
('South Korea', 'KR', '🇰🇷')
ON CONFLICT (code) DO NOTHING;

-- Insert cities for each country
WITH country_data AS (
  SELECT id, code FROM public.countries
)
INSERT INTO public.cities (name, country_id) 
SELECT city_name, country_id FROM (
  VALUES
    ('Istanbul', (SELECT id FROM country_data WHERE code = 'TR')),
    ('Ankara', (SELECT id FROM country_data WHERE code = 'TR')),
    ('Antalya', (SELECT id FROM country_data WHERE code = 'TR')),
    ('Bangkok', (SELECT id FROM country_data WHERE code = 'TH')),
    ('Phuket', (SELECT id FROM country_data WHERE code = 'TH')),
    ('Chiang Mai', (SELECT id FROM country_data WHERE code = 'TH')),
    ('Cancun', (SELECT id FROM country_data WHERE code = 'MX')),
    ('Mexico City', (SELECT id FROM country_data WHERE code = 'MX')),
    ('Tijuana', (SELECT id FROM country_data WHERE code = 'MX')),
    ('Mumbai', (SELECT id FROM country_data WHERE code = 'IN')),
    ('Delhi', (SELECT id FROM country_data WHERE code = 'IN')),
    ('Bangalore', (SELECT id FROM country_data WHERE code = 'IN')),
    ('Warsaw', (SELECT id FROM country_data WHERE code = 'PL')),
    ('Krakow', (SELECT id FROM country_data WHERE code = 'PL')),
    ('Wroclaw', (SELECT id FROM country_data WHERE code = 'PL')),
    ('Budapest', (SELECT id FROM country_data WHERE code = 'HU')),
    ('Debrecen', (SELECT id FROM country_data WHERE code = 'HU')),
    ('Prague', (SELECT id FROM country_data WHERE code = 'CZ')),
    ('Brno', (SELECT id FROM country_data WHERE code = 'CZ')),
    ('Seoul', (SELECT id FROM country_data WHERE code = 'KR')),
    ('Busan', (SELECT id FROM country_data WHERE code = 'KR'))
) AS cities_to_insert(city_name, country_id);

-- Insert treatment categories
INSERT INTO public.treatment_categories (name, description, icon) VALUES
('Dental', 'Complete dental care including cosmetic and restorative treatments', 'Tooth'),
('Hair Transplant', 'Advanced hair restoration techniques and procedures', 'Scissors'),
('Plastic Surgery', 'Cosmetic and reconstructive surgical procedures', 'Sparkles'),
('Eye Surgery', 'Vision correction and eye care treatments', 'Eye'),
('Orthopedics', 'Bone, joint, and muscle treatments', 'Bone'),
('Dermatology', 'Skin care and cosmetic dermatology treatments', 'Palette'),
('Bariatric Surgery', 'Weight loss surgical procedures', 'Scale'),
('Cardiology', 'Heart and cardiovascular treatments', 'Heart')
ON CONFLICT DO NOTHING;

-- Insert treatments for each category
WITH category_data AS (
  SELECT id, name FROM public.treatment_categories
)
INSERT INTO public.treatments (name, category_id, description)
SELECT treatment_name, category_id, treatment_desc FROM (
  VALUES
    -- Dental treatments
    ('Dental Implants', (SELECT id FROM category_data WHERE name = 'Dental'), 'Permanent tooth replacement solution'),
    ('Veneers', (SELECT id FROM category_data WHERE name = 'Dental'), 'Cosmetic dental enhancement'),
    ('All-on-4', (SELECT id FROM category_data WHERE name = 'Dental'), 'Full mouth reconstruction'),
    ('Teeth Whitening', (SELECT id FROM category_data WHERE name = 'Dental'), 'Professional teeth brightening'),
    ('Root Canal', (SELECT id FROM category_data WHERE name = 'Dental'), 'Tooth preservation treatment'),
    
    -- Hair Transplant treatments
    ('FUE Hair Transplant', (SELECT id FROM category_data WHERE name = 'Hair Transplant'), 'Follicular Unit Extraction technique'),
    ('DHI Hair Transplant', (SELECT id FROM category_data WHERE name = 'Hair Transplant'), 'Direct Hair Implantation method'),
    ('Beard Transplant', (SELECT id FROM category_data WHERE name = 'Hair Transplant'), 'Facial hair restoration'),
    ('Eyebrow Transplant', (SELECT id FROM category_data WHERE name = 'Hair Transplant'), 'Eyebrow hair restoration'),
    
    -- Plastic Surgery treatments
    ('Rhinoplasty', (SELECT id FROM category_data WHERE name = 'Plastic Surgery'), 'Nose reshaping surgery'),
    ('Breast Augmentation', (SELECT id FROM category_data WHERE name = 'Plastic Surgery'), 'Breast enhancement surgery'),
    ('Liposuction', (SELECT id FROM category_data WHERE name = 'Plastic Surgery'), 'Fat removal procedure'),
    ('Tummy Tuck', (SELECT id FROM category_data WHERE name = 'Plastic Surgery'), 'Abdominal contouring surgery'),
    ('Facelift', (SELECT id FROM category_data WHERE name = 'Plastic Surgery'), 'Facial rejuvenation surgery'),
    
    -- Eye Surgery treatments
    ('LASIK', (SELECT id FROM category_data WHERE name = 'Eye Surgery'), 'Laser vision correction'),
    ('Cataract Surgery', (SELECT id FROM category_data WHERE name = 'Eye Surgery'), 'Lens replacement surgery'),
    ('Blepharoplasty', (SELECT id FROM category_data WHERE name = 'Eye Surgery'), 'Eyelid surgery'),
    
    -- Orthopedics treatments
    ('Knee Replacement', (SELECT id FROM category_data WHERE name = 'Orthopedics'), 'Joint replacement surgery'),
    ('Hip Replacement', (SELECT id FROM category_data WHERE name = 'Orthopedics'), 'Hip joint reconstruction'),
    ('Spine Surgery', (SELECT id FROM category_data WHERE name = 'Orthopedics'), 'Spinal condition treatment'),
    
    -- Dermatology treatments
    ('Botox', (SELECT id FROM category_data WHERE name = 'Dermatology'), 'Wrinkle reduction treatment'),
    ('Dermal Fillers', (SELECT id FROM category_data WHERE name = 'Dermatology'), 'Facial volume restoration'),
    ('Laser Hair Removal', (SELECT id FROM category_data WHERE name = 'Dermatology'), 'Permanent hair reduction'),
    
    -- Bariatric Surgery treatments
    ('Gastric Sleeve', (SELECT id FROM category_data WHERE name = 'Bariatric Surgery'), 'Stomach reduction surgery'),
    ('Gastric Bypass', (SELECT id FROM category_data WHERE name = 'Bariatric Surgery'), 'Weight loss surgery'),
    
    -- Cardiology treatments
    ('Angioplasty', (SELECT id FROM category_data WHERE name = 'Cardiology'), 'Heart vessel opening procedure'),
    ('Bypass Surgery', (SELECT id FROM category_data WHERE name = 'Cardiology'), 'Heart bypass operation')
) AS treatments_to_insert(treatment_name, category_id, treatment_desc);