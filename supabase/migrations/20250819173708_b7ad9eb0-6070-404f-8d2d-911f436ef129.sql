-- Drop the medical_records table since we only need documents
DROP TABLE IF EXISTS public.medical_records CASCADE;

-- Fix the infinite recursion in family_access RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Hospital staff can manage family access for their patients" ON public.family_access;
DROP POLICY IF EXISTS "Hospital staff can view family access for their patients" ON public.family_access;

-- Recreate simplified policies without recursion
CREATE POLICY "Hospital staff can manage family access for their patients" 
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

-- Ensure documents RLS policies are working correctly
DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;

CREATE POLICY "Users can view documents they have access to" 
ON public.documents 
FOR SELECT 
USING (
  -- Admin can see all
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role))
  OR
  -- Hospital staff can see documents for patients in their hospital
  (EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = documents.patient_id 
    AND p.hospital_id = u.hospital_id
  ))
  OR
  -- Family members and patients can see documents they have access to
  (EXISTS (
    SELECT 1 FROM public.users u, public.family_access fa 
    WHERE u.id = auth.uid() 
    AND u.role IN ('family_member'::user_role, 'patient'::user_role)
    AND fa.user_id = auth.uid() 
    AND fa.patient_id = documents.patient_id 
    AND fa.can_view = true
  ))
);