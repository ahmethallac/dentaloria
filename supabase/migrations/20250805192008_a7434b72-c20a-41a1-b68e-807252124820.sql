-- Create storage buckets for clinic and doctor images
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('clinic-images', 'clinic-images', true),
  ('doctor-images', 'doctor-images', true);

-- Create storage policies for clinic images
CREATE POLICY "Anyone can view clinic images" ON storage.objects
FOR SELECT USING (bucket_id = 'clinic-images');

CREATE POLICY "Clinic admins can upload clinic images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'clinic-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Clinic admins can update their clinic images" ON storage.objects  
FOR UPDATE USING (
  bucket_id = 'clinic-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Clinic admins can delete their clinic images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'clinic-images' AND
  auth.role() = 'authenticated'  
);

-- Create storage policies for doctor images
CREATE POLICY "Anyone can view doctor images" ON storage.objects
FOR SELECT USING (bucket_id = 'doctor-images');

CREATE POLICY "Clinic admins can upload doctor images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'doctor-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Clinic admins can update doctor images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'doctor-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Clinic admins can delete doctor images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'doctor-images' AND
  auth.role() = 'authenticated'
);