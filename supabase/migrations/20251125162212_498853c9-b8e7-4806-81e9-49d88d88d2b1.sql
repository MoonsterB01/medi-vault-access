-- Add RLS policy to allow doctors to view patients they have appointments with
CREATE POLICY "Doctors can view patients they have appointments with"
ON public.patients
FOR SELECT
USING (
  id IN (
    SELECT patient_id 
    FROM appointments 
    WHERE doctor_id IN (
      SELECT id 
      FROM doctors 
      WHERE user_id = auth.uid()
    )
  )
);