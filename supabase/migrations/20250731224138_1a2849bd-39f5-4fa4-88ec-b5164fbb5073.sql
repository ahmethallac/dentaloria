-- Insert countries
INSERT INTO public.countries (name, code) VALUES 
('Turkey', 'TR'),
('United Kingdom', 'GB')
ON CONFLICT (code) DO NOTHING;

-- Insert cities for Turkey
WITH country_data AS (
  SELECT id FROM public.countries WHERE code = 'TR'
)
INSERT INTO public.cities (name, country_id) 
SELECT city_name, country_data.id
FROM (VALUES 
  ('Istanbul'),
  ('Antalya'), 
  ('Izmir')
) AS cities(city_name)
CROSS JOIN country_data
ON CONFLICT DO NOTHING;

-- Insert cities for United Kingdom
WITH country_data AS (
  SELECT id FROM public.countries WHERE code = 'GB'
)
INSERT INTO public.cities (name, country_id)
SELECT city_name, country_data.id  
FROM (VALUES
  ('London'),
  ('Manchester')
) AS cities(city_name)
CROSS JOIN country_data
ON CONFLICT DO NOTHING;