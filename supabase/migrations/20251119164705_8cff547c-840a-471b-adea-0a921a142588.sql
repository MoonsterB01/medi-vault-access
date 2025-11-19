-- Phase 1: Add RLS policy to allow hospital staff to view patients with appointments at affiliated doctors
-- This allows staff to see patients who have appointments with doctors affiliated with their hospital
CREATE POLICY "Hospital staff can view patients with appointments at affiliated doctors"
ON public.patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE a.patient_id = patients.id
      AND u.role = 'hospital_staff'::user_role
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
);