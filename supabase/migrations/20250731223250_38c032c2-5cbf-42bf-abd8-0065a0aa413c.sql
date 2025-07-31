-- Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment categories table
CREATE TABLE public.treatment_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatments table
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.treatment_categories(id) ON DELETE CASCADE,
  description TEXT,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  experience_years INTEGER,
  patient_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clinic images table
CREATE TABLE public.clinic_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clinic treatments table (junction table)
CREATE TABLE public.clinic_treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, treatment_id)
);

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT,
  experience_years INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact requests table
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Create public read policies for most tables
CREATE POLICY "Public read access for countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Public read access for cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Public read access for treatment_categories" ON public.treatment_categories FOR SELECT USING (true);
CREATE POLICY "Public read access for treatments" ON public.treatments FOR SELECT USING (true);
CREATE POLICY "Public read access for clinics" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "Public read access for clinic_images" ON public.clinic_images FOR SELECT USING (true);
CREATE POLICY "Public read access for clinic_treatments" ON public.clinic_treatments FOR SELECT USING (true);
CREATE POLICY "Public read access for doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Public read access for reviews" ON public.reviews FOR SELECT USING (true);

-- Contact requests can be inserted by anyone
CREATE POLICY "Anyone can create contact requests" ON public.contact_requests FOR INSERT WITH CHECK (true);

-- Insert sample data

-- Countries
INSERT INTO public.countries (name, code) VALUES 
('Turkey', 'TR'),
('United States', 'US'),
('Germany', 'DE'),
('Thailand', 'TH'),
('Mexico', 'MX');

-- Cities
INSERT INTO public.cities (name, country_id) VALUES 
('Istanbul', (SELECT id FROM public.countries WHERE code = 'TR')),
('Ankara', (SELECT id FROM public.countries WHERE code = 'TR')),
('Los Angeles', (SELECT id FROM public.countries WHERE code = 'US')),
('Berlin', (SELECT id FROM public.countries WHERE code = 'DE')),
('Bangkok', (SELECT id FROM public.countries WHERE code = 'TH')),
('Cancun', (SELECT id FROM public.countries WHERE code = 'MX'));

-- Treatment Categories
INSERT INTO public.treatment_categories (name, description) VALUES 
('Hair Transplant', 'Hair restoration and transplantation procedures'),
('Dental', 'Dental treatments and oral surgery'),
('Plastic Surgery', 'Cosmetic and reconstructive surgery'),
('Eye Surgery', 'Laser eye surgery and vision correction'),
('Wellness', 'Health and wellness treatments');

-- Treatments
INSERT INTO public.treatments (name, category_id, description, min_price, max_price) VALUES 
('FUE Hair Transplant', (SELECT id FROM public.treatment_categories WHERE name = 'Hair Transplant'), 'Follicular Unit Extraction hair transplant', 2000, 8000),
('DHI Hair Transplant', (SELECT id FROM public.treatment_categories WHERE name = 'Hair Transplant'), 'Direct Hair Implantation', 3000, 10000),
('Dental Implants', (SELECT id FROM public.treatment_categories WHERE name = 'Dental'), 'Single or multiple dental implants', 800, 3000),
('Smile Design', (SELECT id FROM public.treatment_categories WHERE name = 'Dental'), 'Complete smile makeover', 2000, 15000),
('Rhinoplasty', (SELECT id FROM public.treatment_categories WHERE name = 'Plastic Surgery'), 'Nose reshaping surgery', 3000, 12000),
('LASIK Surgery', (SELECT id FROM public.treatment_categories WHERE name = 'Eye Surgery'), 'Laser vision correction', 1000, 5000);

-- Clinics
INSERT INTO public.clinics (name, description, address, city_id, phone, email, rating, review_count, is_featured, is_verified, experience_years, patient_count) VALUES 
('Istanbul Hair Center', 'Leading hair transplant clinic in Turkey with over 10 years of experience', 'Nisantasi, Istanbul', (SELECT id FROM public.cities WHERE name = 'Istanbul'), '+90 212 123 4567', 'info@istanbulhair.com', 4.8, 1250, true, true, 12, 15000),
('Elite Dental Clinic', 'Premium dental care with state-of-the-art technology', 'Kizilay, Ankara', (SELECT id FROM public.cities WHERE name = 'Ankara'), '+90 312 987 6543', 'contact@elitedental.com', 4.7, 890, true, true, 8, 8500),
('Beverly Hills Surgery', 'Luxury plastic surgery center in Los Angeles', 'Beverly Hills, CA', (SELECT id FROM public.cities WHERE name = 'Los Angeles'), '+1 323 555 0123', 'info@bhsurgery.com', 4.9, 567, true, true, 15, 5200),
('Berlin Eye Institute', 'Advanced eye care and LASIK surgery', 'Mitte, Berlin', (SELECT id FROM public.cities WHERE name = 'Berlin'), '+49 30 123 4567', 'contact@berlineye.de', 4.6, 432, false, true, 10, 3200),
('Bangkok Wellness Center', 'Holistic health and wellness treatments', 'Sukhumvit, Bangkok', (SELECT id FROM public.cities WHERE name = 'Bangkok'), '+66 2 123 4567', 'info@bangkokwellness.com', 4.5, 678, false, true, 6, 4100);

-- Clinic Images
INSERT INTO public.clinic_images (clinic_id, image_url, is_primary) VALUES 
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), '/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png', true),
((SELECT id FROM public.clinics WHERE name = 'Elite Dental Clinic'), '/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png', true),
((SELECT id FROM public.clinics WHERE name = 'Beverly Hills Surgery'), '/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png', true),
((SELECT id FROM public.clinics WHERE name = 'Berlin Eye Institute'), '/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png', true),
((SELECT id FROM public.clinics WHERE name = 'Bangkok Wellness Center'), '/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png', true);

-- Clinic Treatments
INSERT INTO public.clinic_treatments (clinic_id, treatment_id, price) VALUES 
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), (SELECT id FROM public.treatments WHERE name = 'FUE Hair Transplant'), 3500),
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), (SELECT id FROM public.treatments WHERE name = 'DHI Hair Transplant'), 4500),
((SELECT id FROM public.clinics WHERE name = 'Elite Dental Clinic'), (SELECT id FROM public.treatments WHERE name = 'Dental Implants'), 1200),
((SELECT id FROM public.clinics WHERE name = 'Elite Dental Clinic'), (SELECT id FROM public.treatments WHERE name = 'Smile Design'), 8000),
((SELECT id FROM public.clinics WHERE name = 'Beverly Hills Surgery'), (SELECT id FROM public.treatments WHERE name = 'Rhinoplasty'), 9500),
((SELECT id FROM public.clinics WHERE name = 'Berlin Eye Institute'), (SELECT id FROM public.treatments WHERE name = 'LASIK Surgery'), 2800);

-- Doctors
INSERT INTO public.doctors (clinic_id, name, specialization, experience_years) VALUES 
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), 'Dr. Mehmet Özkan', 'Hair Transplant Specialist', 15),
((SELECT id FROM public.clinics WHERE name = 'Elite Dental Clinic'), 'Dr. Ayşe Demir', 'Oral and Maxillofacial Surgeon', 12),
((SELECT id FROM public.clinics WHERE name = 'Beverly Hills Surgery'), 'Dr. Michael Johnson', 'Plastic Surgery', 18),
((SELECT id FROM public.clinics WHERE name = 'Berlin Eye Institute'), 'Dr. Hans Mueller', 'Ophthalmologist', 14);

-- Reviews
INSERT INTO public.reviews (clinic_id, reviewer_name, rating, comment) VALUES 
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), 'John Smith', 5, 'Excellent service and amazing results. Highly recommended!'),
((SELECT id FROM public.clinics WHERE name = 'Istanbul Hair Center'), 'Maria Garcia', 5, 'Professional staff and great facilities.'),
((SELECT id FROM public.clinics WHERE name = 'Elite Dental Clinic'), 'Ahmed Ali', 4, 'Good dental care, modern equipment.'),
((SELECT id FROM public.clinics WHERE name = 'Beverly Hills Surgery'), 'Sarah Wilson', 5, 'Outstanding results, very professional team.');