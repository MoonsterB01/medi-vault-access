-- Fix infinite recursion in patients table RLS policies
-- Drop the problematic policies that use user_has_patient_access()
DROP POLICY IF EXISTS "Users can view accessible patients" ON patients;
DROP POLICY IF EXISTS "Users can update accessible patients" ON patients;

-- Create simpler, direct RLS policies without recursion
CREATE POLICY "Users can view their own patients"
ON patients FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can update their own patients"
ON patients FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Drop the problematic function since it's no longer needed
DROP FUNCTION IF EXISTS user_has_patient_access(uuid, uuid);