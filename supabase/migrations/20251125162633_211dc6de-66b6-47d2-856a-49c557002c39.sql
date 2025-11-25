-- Drop the problematic policy
DROP POLICY IF EXISTS "Doctors can view patients they have appointments with" ON public.patients;

-- Create security definer function to check if doctor can view patient
CREATE OR REPLACE FUNCTION public.doctor_can_view_patient(patient_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = patient_id_param
    AND d.user_id = auth.uid()
  );
$$;

-- Create new policy using the security definer function
CREATE POLICY "Doctors can view their appointment patients"
ON public.patients
FOR SELECT
USING (public.doctor_can_view_patient(id));