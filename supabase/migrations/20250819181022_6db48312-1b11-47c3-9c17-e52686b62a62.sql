-- Fix infinite recursion in family_access RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Hospital staff can manage access for their patients" ON family_access;
DROP POLICY IF EXISTS "Hospital staff can insert access for their patients" ON family_access;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.can_user_manage_patient(patient_id_param uuid)
RETURNS boolean AS $$
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
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate policies using the security definer function
CREATE POLICY "Hospital staff can manage access for their patients" 
ON family_access FOR ALL
USING (can_user_manage_patient(patient_id));

CREATE POLICY "Hospital staff can insert access for their patients" 
ON family_access FOR INSERT
WITH CHECK (can_user_manage_patient(patient_id));