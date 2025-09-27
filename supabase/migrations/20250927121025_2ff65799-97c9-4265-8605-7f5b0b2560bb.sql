-- Enable Row Level Security on patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to avoid duplicates
DROP POLICY IF EXISTS "Admins can manage all patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view accessible patients" ON public.patients;
DROP POLICY IF EXISTS "Hospital staff can view patients for their hospital" ON public.patients;

-- Admins can manage all patients
CREATE POLICY "Admins can manage all patients"
ON public.patients
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Users can view patients they have access to (via family_access) or their own created record
CREATE POLICY "Users can view accessible patients"
ON public.patients
FOR SELECT
USING (
  user_has_patient_access(auth.uid(), id)
  OR created_by = auth.uid()
);

-- Hospital staff can view patients for their hospital
CREATE POLICY "Hospital staff can view patients for their hospital"
ON public.patients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'hospital_staff'::user_role
      AND u.hospital_id IS NOT NULL
      AND u.hospital_id = patients.hospital_id
  )
);
