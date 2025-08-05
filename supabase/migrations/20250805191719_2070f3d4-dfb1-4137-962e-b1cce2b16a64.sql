-- First, let's clean up and restructure the database for dental clinic system

-- Update countries to only include Turkey, UK, USA
DELETE FROM countries;
INSERT INTO countries (id, name, code) VALUES 
  (gen_random_uuid(), 'Turkey', 'TR'),
  (gen_random_uuid(), 'United Kingdom', 'GB'), 
  (gen_random_uuid(), 'United States', 'US');

-- Update cities with specific cities for each country
DELETE FROM cities;

-- Insert Turkey cities
INSERT INTO cities (id, name, country_id) 
SELECT gen_random_uuid(), 'Istanbul', c.id FROM countries c WHERE c.code = 'TR'
UNION ALL
SELECT gen_random_uuid(), 'Izmir', c.id FROM countries c WHERE c.code = 'TR'  
UNION ALL
SELECT gen_random_uuid(), 'Antalya', c.id FROM countries c WHERE c.code = 'TR';

-- Insert UK cities
INSERT INTO cities (id, name, country_id)
SELECT gen_random_uuid(), 'London', c.id FROM countries c WHERE c.code = 'GB'
UNION ALL  
SELECT gen_random_uuid(), 'Manchester', c.id FROM countries c WHERE c.code = 'GB';

-- Insert US cities
INSERT INTO cities (id, name, country_id)
SELECT gen_random_uuid(), 'New York City', c.id FROM countries c WHERE c.code = 'US'
UNION ALL
SELECT gen_random_uuid(), 'Los Angeles', c.id FROM countries c WHERE c.code = 'US';

-- Clean up treatment categories - only dental treatments
DELETE FROM treatment_categories;
INSERT INTO treatment_categories (id, name, description) VALUES 
  (gen_random_uuid(), 'Dental Implants', 'Various dental implant procedures'),
  (gen_random_uuid(), 'Dental Aesthetics', 'Cosmetic dental treatments'),
  (gen_random_uuid(), 'Orthodontics', 'Teeth alignment and correction'),
  (gen_random_uuid(), 'Oral Surgery', 'Surgical dental procedures');

-- Update treatments with only dental procedures
DELETE FROM treatments;

-- Get category IDs for insertion
WITH categories AS (
  SELECT id, name FROM treatment_categories
)
INSERT INTO treatments (id, name, description, category_id, min_price, max_price)
SELECT 
  gen_random_uuid(),
  treatment_name,
  treatment_desc,
  cat.id,
  min_p,
  max_p
FROM categories cat
CROSS JOIN (VALUES
  ('All-on-4 Dental Implants', 'Complete arch restoration with 4 implants', 'Dental Implants', 8000, 15000),
  ('All-on-6 Dental Implants', 'Complete arch restoration with 6 implants', 'Dental Implants', 10000, 18000),
  ('Single Tooth Implant', 'Individual tooth replacement', 'Dental Implants', 1200, 3000),
  ('Multiple Tooth Implants', 'Multiple teeth replacement', 'Dental Implants', 3000, 8000),
  ('Porcelain Veneers', 'Ceramic tooth coverings for aesthetics', 'Dental Aesthetics', 300, 800),
  ('Teeth Whitening', 'Professional tooth whitening treatment', 'Dental Aesthetics', 200, 600),
  ('Composite Bonding', 'Tooth-colored filling and shaping', 'Dental Aesthetics', 150, 400),
  ('Invisalign', 'Clear aligner orthodontic treatment', 'Orthodontics', 2500, 6000),
  ('Traditional Braces', 'Metal or ceramic braces', 'Orthodontics', 1500, 4000),
  ('Wisdom Tooth Extraction', 'Surgical removal of wisdom teeth', 'Oral Surgery', 200, 800),
  ('Dental Crown', 'Full tooth coverage restoration', 'Dental Aesthetics', 400, 1200)
) AS t(treatment_name, treatment_desc, cat_name, min_p, max_p)
WHERE cat.name = t.cat_name;

-- Add trustpilot_rating to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trustpilot_url TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trustpilot_rating NUMERIC(3,2);

-- Update doctors table structure for better dental clinic requirements  
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS title TEXT; -- Dr., Prof. Dr., etc.
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Make sure clinic_treatments table has proper price field as starting_price_euro
ALTER TABLE clinic_treatments ADD COLUMN IF NOT EXISTS starting_price_euro NUMERIC(10,2);

-- Update profiles table to only allow clinic_admin user type
UPDATE profiles SET user_type = 'clinic_admin' WHERE user_type != 'clinic_admin';

-- Create RLS policies for clinic admin operations
CREATE POLICY "Clinic admins can manage doctors" ON doctors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM clinics 
    WHERE clinics.id = doctors.clinic_id 
    AND clinics.user_id = auth.uid()
  )
);

CREATE POLICY "Clinic admins can manage clinic treatments" ON clinic_treatments  
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM clinics
    WHERE clinics.id = clinic_treatments.clinic_id
    AND clinics.user_id = auth.uid()  
  )
);

-- Enable RLS on doctors and clinic_treatments tables
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_treatments ENABLE ROW LEVEL SECURITY;