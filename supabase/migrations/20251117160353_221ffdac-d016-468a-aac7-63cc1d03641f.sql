-- Allow hospital staff to manage appointment slots for their affiliated doctors
CREATE POLICY "Hospital staff can manage slots for affiliated doctors"
ON public.appointment_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.doctors d
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.id = appointment_slots.doctor_id
    AND u.hospital_id = ANY(d.hospital_affiliations)
    AND u.role = 'hospital_staff'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.doctors d
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.id = appointment_slots.doctor_id
    AND u.hospital_id = ANY(d.hospital_affiliations)
    AND u.role = 'hospital_staff'::user_role
  )
);