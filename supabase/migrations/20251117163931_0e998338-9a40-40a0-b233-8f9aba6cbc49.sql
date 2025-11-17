-- Add RLS policy for hospital staff to view appointments for affiliated doctors
DROP POLICY IF EXISTS "Hospital staff can view appointments for affiliated doctors" ON appointments;

CREATE POLICY "Hospital staff can view appointments for affiliated doctors"
ON appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users u
    JOIN doctors d ON d.id = appointments.doctor_id
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
);

-- Also add policy for hospital staff to update appointments
DROP POLICY IF EXISTS "Hospital staff can update appointments for affiliated doctors" ON appointments;

CREATE POLICY "Hospital staff can update appointments for affiliated doctors"
ON appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users u
    JOIN doctors d ON d.id = appointments.doctor_id
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
);