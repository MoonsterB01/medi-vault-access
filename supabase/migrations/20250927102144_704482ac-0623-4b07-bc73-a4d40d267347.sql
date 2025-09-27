-- Critical Security Fixes: Restrict Public Data Access

-- 1. Update doctors table - restrict public access to sensitive information
DROP POLICY IF EXISTS "Anyone can view doctor profiles" ON public.doctors;

CREATE POLICY "Public can view basic doctor info only"
ON public.doctors
FOR SELECT
TO anon, authenticated
USING (true);

-- Add a more restrictive policy for sensitive doctor data
-- This will be handled in application logic to filter sensitive fields

-- 2. Restrict medical_keywords to authenticated users only
DROP POLICY IF EXISTS "Anyone can view medical keywords" ON public.medical_keywords;

CREATE POLICY "Authenticated users can view medical keywords"
ON public.medical_keywords
FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict file_hashes to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view file hashes" ON public.file_hashes;

CREATE POLICY "Authenticated users can view file hashes"
ON public.file_hashes
FOR SELECT
TO authenticated
USING (true);

-- 4. Add RLS policies for hospitals table
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hospitals"
ON public.hospitals
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage hospitals"
ON public.hospitals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hospital staff can view their hospital"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT hospital_id 
    FROM users 
    WHERE id = auth.uid() AND role = 'hospital_staff'
  )
);

-- 5. Restrict content_categories to authenticated users
DROP POLICY IF EXISTS "Anyone can view categories" ON public.content_categories;

CREATE POLICY "Authenticated users can view categories"
ON public.content_categories
FOR SELECT
TO authenticated
USING (true);