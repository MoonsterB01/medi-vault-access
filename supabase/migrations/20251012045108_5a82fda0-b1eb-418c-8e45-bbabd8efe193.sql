-- =====================================================
-- CRITICAL SECURITY FIX: Secure Storage Access Control
-- =====================================================
-- This migration fixes unauthorized access to medical documents
-- by implementing strict RLS policies based on patient access

-- =====================================================
-- Step 1: Create Security Definer Helper Functions
-- =====================================================

-- Function to extract patient_id from storage file path
-- File paths follow format: {patient_id}/{timestamp}-{filename}
CREATE OR REPLACE FUNCTION public.extract_patient_id_from_path(file_path TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_uuid UUID;
BEGIN
  -- Extract the first part of the path (patient_id)
  -- Split by '/' and take the first element
  BEGIN
    patient_uuid := (string_to_array(file_path, '/'))[1]::UUID;
    RETURN patient_uuid;
  EXCEPTION
    WHEN OTHERS THEN
      -- If conversion fails, return NULL
      RETURN NULL;
  END;
END;
$$;

-- Function to check if a user can access a patient's files
CREATE OR REPLACE FUNCTION public.user_can_access_patient_files(
  user_id_param UUID,
  patient_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if patient_id is NULL (invalid path)
  IF patient_id_param IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id_param 
    AND role = 'admin'::user_role
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has family_access to this patient
  IF EXISTS (
    SELECT 1 FROM public.family_access
    WHERE user_id = user_id_param
    AND patient_id = patient_id_param
    AND can_view = true
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is hospital staff for this patient's hospital
  IF EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.patients p ON p.hospital_id = u.hospital_id
    WHERE u.id = user_id_param
    AND u.role = 'hospital_staff'::user_role
    AND p.id = patient_id_param
    AND u.hospital_id IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- =====================================================
-- Step 2: Drop All Existing Permissive Storage Policies
-- =====================================================

-- Drop policies from medical-documents bucket
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Hospital staff can view files in their hospital folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Hospital staff can upload to their hospital folder" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Drop policies from medical_records bucket (if any)
DROP POLICY IF EXISTS "Anyone can upload medical records" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view medical records" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete medical records" ON storage.objects;

-- =====================================================
-- Step 3: Create Strict Storage RLS Policies
-- =====================================================

-- Policy 1: Admins have full access to all medical documents
CREATE POLICY "Admins have full access to medical documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id IN ('medical-documents', 'medical_records')
  AND has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  bucket_id IN ('medical-documents', 'medical_records')
  AND has_role(auth.uid(), 'admin'::user_role)
);

-- Policy 2: Users can only view documents for patients they have access to
CREATE POLICY "Users can view documents they have access to"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('medical-documents', 'medical_records')
  AND public.user_can_access_patient_files(
    auth.uid(),
    public.extract_patient_id_from_path(name)
  )
);

-- Policy 3: Users can only upload to patients they have access to
CREATE POLICY "Users can upload to patients they have access to"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('medical-documents', 'medical_records')
  AND public.user_can_access_patient_files(
    auth.uid(),
    public.extract_patient_id_from_path(name)
  )
);

-- Policy 4: Users can only delete documents for patients they have access to
CREATE POLICY "Users can delete documents they have access to"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('medical-documents', 'medical_records')
  AND (
    has_role(auth.uid(), 'admin'::user_role)
    OR public.user_can_access_patient_files(
      auth.uid(),
      public.extract_patient_id_from_path(name)
    )
  )
);

-- =====================================================
-- Step 5: Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.extract_patient_id_from_path IS 
'Extracts patient UUID from storage file path format: {patient_id}/{timestamp}-{filename}';

COMMENT ON FUNCTION public.user_can_access_patient_files IS 
'Security definer function to check if a user has access to a patient''s files. Returns true for: admins, users with family_access, or hospital staff for the patient''s hospital.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Next steps:
-- 1. Test as different user roles
-- 2. Verify direct URL access is blocked
-- 3. Confirm upload/download still works via edge functions
-- =====================================================