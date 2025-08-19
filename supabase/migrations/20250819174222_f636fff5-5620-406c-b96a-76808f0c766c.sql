-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.user_can_access_patient(patient_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_access fa
    WHERE fa.patient_id = patient_id_param 
    AND fa.user_id = auth.uid() 
    AND fa.can_view = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_hospital_can_access_patient(patient_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u, public.patients p 
    WHERE u.id = auth.uid() 
    AND u.role = 'hospital_staff'::user_role 
    AND p.id = patient_id_param 
    AND p.hospital_id = u.hospital_id
  );
$$;

-- Drop ALL existing policies on family_access to start fresh
DROP POLICY IF EXISTS "Admins can manage all family access" ON public.family_access;
DROP POLICY IF EXISTS "Hospital staff can manage family access for their patients" ON public.family_access;
DROP POLICY IF EXISTS "Hospital staff can view family access for their patients" ON public.family_access;
DROP POLICY IF EXISTS "Users can view their own family access" ON public.family_access;

-- Create simple, non-recursive policies
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

-- Update documents policy to use security definer function
DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;

CREATE POLICY "Users can view documents they have access to" 
ON public.documents 
FOR SELECT 
USING (
  -- Admin can see all
  (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'::user_role))
  OR
  -- Hospital staff can see documents for patients in their hospital
  (user_hospital_can_access_patient(documents.patient_id))
  OR
  -- Family members and patients can see documents they have access to
  (user_can_access_patient(documents.patient_id))
);