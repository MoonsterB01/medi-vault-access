-- Phase 1: Emergency Database Fixes - Remove family_access dependencies

-- 1. Replace handle_patient_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_patient_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_patient_id uuid;
  default_hospital_id uuid;
BEGIN
  -- Only process if this is a patient role user
  IF NEW.role = 'patient'::user_role THEN
    -- Try to get an existing hospital, but don't fail if none exists
    SELECT id INTO default_hospital_id FROM public.hospitals LIMIT 1;
    
    -- Create a patient record (hospital_id can be NULL now)
    INSERT INTO public.patients (
      name,
      dob,
      gender,
      primary_contact,
      hospital_id,
      created_by
    ) VALUES (
      NEW.name,
      CURRENT_DATE - INTERVAL '30 years', -- Default DOB, should be updated by user
      'Unknown', -- Default gender, should be updated by user  
      NEW.email,
      default_hospital_id, -- This can be NULL now
      NEW.id
    ) RETURNING id INTO new_patient_id;

    -- No longer create family_access record - removed
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Replace user_has_patient_access() - check created_by instead of family_access
CREATE OR REPLACE FUNCTION public.user_has_patient_access(user_id_param uuid, patient_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- In 1:1 model, user has access if they created the patient
  RETURN EXISTS (
    SELECT 1 FROM patients
    WHERE id = patient_id_param 
    AND created_by = user_id_param
  );
END;
$$;

-- 3. Replace can_user_manage_patient() - simplified for 1:1 model
CREATE OR REPLACE FUNCTION public.can_user_manage_patient(patient_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is hospital staff for this patient
  IF EXISTS (
    SELECT 1 FROM users u, patients p
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = patient_id_param 
    AND p.hospital_id = u.hospital_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user created this patient (1:1 model)
  IF EXISTS (
    SELECT 1 FROM patients
    WHERE id = patient_id_param 
    AND created_by = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 4. Replace user_can_access_patient_files() - 1:1 model checks
CREATE OR REPLACE FUNCTION public.user_can_access_patient_files(user_id_param uuid, patient_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Check if user created this patient (1:1 model)
  IF EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = patient_id_param
    AND created_by = user_id_param
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