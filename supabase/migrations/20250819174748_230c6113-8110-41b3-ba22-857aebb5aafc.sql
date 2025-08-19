-- Drop the problematic security definer functions that lose auth context (with CASCADE)
DROP FUNCTION IF EXISTS public.user_can_access_patient(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_hospital_can_access_patient(uuid) CASCADE;

-- Create simple, direct RLS policies for family_access (no security definer functions)
CREATE POLICY "Admins have full access" 
ON public.family_access 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role)
);

CREATE POLICY "Users can view their own access records" 
ON public.family_access 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Hospital staff can manage access for their patients" 
ON public.family_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = family_access.patient_id 
    AND p.hospital_id = u.hospital_id
  )
);

CREATE POLICY "Hospital staff can insert access for their patients" 
ON public.family_access 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = family_access.patient_id 
    AND p.hospital_id = u.hospital_id
  )
);

-- Create working documents policies without security definer functions
CREATE POLICY "Users can view documents they have access to" 
ON public.documents 
FOR SELECT 
USING (
  -- Admin can see all
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role)
  OR
  -- Hospital staff can see documents for patients in their hospital
  EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = documents.patient_id 
    AND p.hospital_id = u.hospital_id
  )
  OR
  -- Family members and patients can see documents they have access to
  EXISTS (
    SELECT 1 FROM public.family_access fa
    WHERE fa.patient_id = documents.patient_id 
    AND fa.user_id = auth.uid() 
    AND fa.can_view = true
  )
);

CREATE POLICY "Hospital staff can upload documents for their patients" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = documents.patient_id 
    AND p.hospital_id = u.hospital_id
  )
);