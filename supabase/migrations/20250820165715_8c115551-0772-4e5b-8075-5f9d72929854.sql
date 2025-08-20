-- Update the can_user_manage_patient function to allow patients to manage patient records they have access to
CREATE OR REPLACE FUNCTION public.can_user_manage_patient(patient_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Check if user is a patient with access to this patient record
  IF EXISTS (
    SELECT 1 FROM users u, family_access fa
    WHERE u.id = auth.uid() 
    AND u.role = 'patient'::user_role
    AND fa.patient_id = patient_id_param 
    AND fa.user_id = auth.uid()
    AND fa.can_view = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Add RLS policy to allow patients to grant access for their own patient records
CREATE POLICY "Patients can grant access for their own records" 
ON public.family_access 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u, family_access existing_access
    WHERE u.id = auth.uid() 
    AND u.role = 'patient'::user_role
    AND existing_access.patient_id = family_access.patient_id 
    AND existing_access.user_id = auth.uid()
    AND existing_access.can_view = true
  )
);