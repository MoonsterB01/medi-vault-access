-- Create security definer function to check patient access without RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_patient_access(user_id_param uuid, patient_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to the patient record
  RETURN EXISTS (
    SELECT 1 FROM family_access
    WHERE user_id = user_id_param 
    AND patient_id = patient_id_param
    AND can_view = true
  );
END;
$function$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Patients can grant access for their own records" ON public.family_access;

-- Create new policy using the security definer function
CREATE POLICY "Patients can grant access for their own records" 
ON public.family_access 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'patient'::user_role
    AND user_has_patient_access(auth.uid(), family_access.patient_id)
  )
);