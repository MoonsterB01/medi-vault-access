-- Step 1: Update existing hospital staff users to set their hospital_id
UPDATE users u
SET hospital_id = ha.hospital_id
FROM hospital_admins ha
WHERE u.id = ha.user_id 
  AND u.role = 'hospital_staff'::user_role
  AND u.hospital_id IS NULL;

-- Step 2: Create trigger function to auto-sync hospital_id when hospital_admin is created
CREATE OR REPLACE FUNCTION sync_user_hospital_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET hospital_id = NEW.hospital_id
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on hospital_admins
DROP TRIGGER IF EXISTS on_hospital_admin_created ON hospital_admins;
CREATE TRIGGER on_hospital_admin_created
  AFTER INSERT ON hospital_admins
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_hospital_id();

-- Step 4: Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Hospital staff can create slots for affiliated doctors" ON appointment_slots;
DROP POLICY IF EXISTS "Hospital staff can manage slots for affiliated doctors" ON appointment_slots;

-- Step 5: Create updated RLS policy for hospital staff to INSERT slots
CREATE POLICY "Hospital staff can create slots for affiliated doctors"
ON appointment_slots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    INNER JOIN doctors d ON d.id = appointment_slots.doctor_id
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'::user_role
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
);

-- Step 6: Create updated RLS policy for hospital staff to UPDATE/DELETE slots
CREATE POLICY "Hospital staff can manage slots for affiliated doctors"
ON appointment_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    INNER JOIN doctors d ON d.id = appointment_slots.doctor_id
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'::user_role
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    INNER JOIN doctors d ON d.id = appointment_slots.doctor_id
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'::user_role
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = ANY(d.hospital_affiliations)
  )
);