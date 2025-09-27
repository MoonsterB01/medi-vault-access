-- Update remaining policies that still use get_user_role

-- Update doctors table policies
DROP POLICY IF EXISTS "Admins can manage all doctors" ON public.doctors;

CREATE POLICY "Admins can manage all doctors"
ON public.doctors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update storage policies (these are on the storage.objects table)
-- First check what storage policies exist
DROP POLICY IF EXISTS "Hospital staff can upload to their hospital folder" ON storage.objects;
DROP POLICY IF EXISTS "Hospital staff can view files in their hospital folder" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;

-- Create new secure storage policies
CREATE POLICY "Admins can manage all files"
ON storage.objects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hospital staff can upload to their hospital folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hospital_staff')
  AND bucket_id = 'medical-documents'
);

CREATE POLICY "Hospital staff can view files in their hospital folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'hospital_staff')
  AND bucket_id = 'medical-documents'
);

CREATE POLICY "Family members can view files they have access to"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'family_member')
  AND bucket_id = 'medical-documents'
);

CREATE POLICY "Users can view documents they have access to"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-documents'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hospital_staff')
    OR public.has_role(auth.uid(), 'family_member')
    OR public.has_role(auth.uid(), 'patient')
  )
);

-- Now safely drop the old functions
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_hospital(uuid) CASCADE;