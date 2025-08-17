-- Fix circular dependency in RLS policies between family_access and patients tables

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Family members can view patients they have access to" ON public.patients;
DROP POLICY IF EXISTS "Patients can view themselves if they have user account" ON public.patients;
DROP POLICY IF EXISTS "Hospital staff can view family access for their patients" ON public.family_access;
DROP POLICY IF EXISTS "Hospital staff can manage family access for their patients" ON public.family_access;

-- Recreate patients policies without circular references
CREATE POLICY "Family members can view patients they have access to" ON public.patients
FOR SELECT USING (
  get_user_role(auth.uid()) = 'family_member'::user_role 
  AND id IN (
    SELECT patient_id FROM public.family_access 
    WHERE user_id = auth.uid() AND can_view = true
  )
);

CREATE POLICY "Patients can view themselves if they have user account" ON public.patients
FOR SELECT USING (
  get_user_role(auth.uid()) = 'patient'::user_role 
  AND id IN (
    SELECT patient_id FROM public.family_access 
    WHERE user_id = auth.uid()
  )
);

-- Recreate family_access policies without circular references
CREATE POLICY "Hospital staff can view family access for their patients" ON public.family_access
FOR SELECT USING (
  get_user_role(auth.uid()) = 'hospital_staff'::user_role 
  AND patient_id IN (
    SELECT id FROM public.patients 
    WHERE hospital_id = get_user_hospital(auth.uid())
  )
);

CREATE POLICY "Hospital staff can manage family access for their patients" ON public.family_access
FOR ALL USING (
  get_user_role(auth.uid()) = 'hospital_staff'::user_role 
  AND patient_id IN (
    SELECT id FROM public.patients 
    WHERE hospital_id = get_user_hospital(auth.uid())
  )
);