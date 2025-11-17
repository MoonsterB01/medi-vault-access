-- Fix appointments RLS - Allow patients to book appointments for their own patients
-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can create appointments for their patients" ON appointments;
DROP POLICY IF EXISTS "Users can view appointments for their patients" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments for their patients" ON appointments;

-- Allow users to INSERT appointments for patients they created
CREATE POLICY "Users can create appointments for their patients"
ON appointments
FOR INSERT
TO authenticated
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Allow users to view appointments for patients they created
CREATE POLICY "Users can view appointments for their patients"
ON appointments
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);

-- Allow users to update/cancel their own appointments
CREATE POLICY "Users can update appointments for their patients"
ON appointments
FOR UPDATE
TO authenticated
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);