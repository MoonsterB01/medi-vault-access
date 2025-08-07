-- Fix the RLS policy for family members viewing patients
-- The current policy has a bug where it compares family_access.patient_id = family_access.id
-- instead of family_access.patient_id = patients.id

DROP POLICY IF EXISTS "Family members can view patients they have access to" ON patients;

CREATE POLICY "Family members can view patients they have access to" 
ON patients 
FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'family_member'::user_role) 
  AND (EXISTS ( 
    SELECT 1
    FROM family_access
    WHERE (
      family_access.patient_id = patients.id 
      AND family_access.user_id = auth.uid() 
      AND family_access.can_view = true
    )
  ))
);

-- Also fix the similar policy for patients viewing themselves
DROP POLICY IF EXISTS "Patients can view themselves if they have user account" ON patients;

CREATE POLICY "Patients can view themselves if they have user account" 
ON patients 
FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'patient'::user_role) 
  AND (EXISTS ( 
    SELECT 1
    FROM family_access
    WHERE (
      family_access.patient_id = patients.id 
      AND family_access.user_id = auth.uid()
    )
  ))
);