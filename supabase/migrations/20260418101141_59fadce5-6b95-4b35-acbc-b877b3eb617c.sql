-- =========================================
-- 1. Create family_access table
-- =========================================
CREATE TABLE IF NOT EXISTS public.family_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  family_user_id UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{"view": true, "upload": true, "appointments": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT family_access_unique_link UNIQUE (patient_id, family_user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_access_family_user ON public.family_access(family_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_access_patient ON public.family_access(patient_id) WHERE is_active = true;

ALTER TABLE public.family_access ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_family_access_updated_at
  BEFORE UPDATE ON public.family_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. Security definer helper functions
-- =========================================

-- Check if a user has active family access to a given patient
CREATE OR REPLACE FUNCTION public.user_has_family_access(_user_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_access
    WHERE family_user_id = _user_id
      AND patient_id = _patient_id
      AND is_active = true
      AND revoked_at IS NULL
  );
$$;

-- Get all patient IDs the current user has family access to
CREATE OR REPLACE FUNCTION public.get_family_accessible_patient_ids()
RETURNS TABLE(patient_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fa.patient_id
  FROM public.family_access fa
  WHERE fa.family_user_id = auth.uid()
    AND fa.is_active = true
    AND fa.revoked_at IS NULL;
$$;

-- Check a specific permission for the current user on a patient
CREATE OR REPLACE FUNCTION public.user_has_family_permission(_patient_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_access
    WHERE family_user_id = auth.uid()
      AND patient_id = _patient_id
      AND is_active = true
      AND revoked_at IS NULL
      AND COALESCE((permissions->>_permission)::boolean, false) = true
  );
$$;

-- =========================================
-- 3. RLS policies on family_access itself
-- (NO self-references; safe from recursion)
-- =========================================

-- Family member can create a link for themselves
CREATE POLICY "Family member can create their own access link"
ON public.family_access
FOR INSERT
TO authenticated
WITH CHECK (family_user_id = auth.uid());

-- Family member can see their own access links
CREATE POLICY "Family member can view their own access links"
ON public.family_access
FOR SELECT
TO authenticated
USING (family_user_id = auth.uid());

-- Family member can leave (delete their own link)
CREATE POLICY "Family member can leave (delete own link)"
ON public.family_access
FOR DELETE
TO authenticated
USING (family_user_id = auth.uid());

-- Patient owner can view who has access to their patient record
CREATE POLICY "Patient owner can view family access to their records"
ON public.family_access
FOR SELECT
TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
);

-- Patient owner can update (revoke) family access
CREATE POLICY "Patient owner can update family access"
ON public.family_access
FOR UPDATE
TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
);

-- Patient owner can delete family access entirely
CREATE POLICY "Patient owner can delete family access"
ON public.family_access
FOR DELETE
TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
);

-- =========================================
-- 4. Additive policies on dependent tables
-- (Use security definer helpers — no recursion)
-- =========================================

-- patients: family helpers can view linked patient profile
CREATE POLICY "Family helpers can view linked patients"
ON public.patients
FOR SELECT
TO authenticated
USING (public.user_has_family_access(auth.uid(), id));

-- documents: family helpers can view (if view permission)
CREATE POLICY "Family helpers can view documents"
ON public.documents
FOR SELECT
TO authenticated
USING (public.user_has_family_permission(patient_id, 'view'));

-- documents: family helpers can upload (if upload permission)
CREATE POLICY "Family helpers can upload documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_family_permission(patient_id, 'upload')
  AND uploaded_by = auth.uid()
);

-- patient_summaries: family helpers can view
CREATE POLICY "Family helpers can view patient summaries"
ON public.patient_summaries
FOR SELECT
TO authenticated
USING (public.user_has_family_permission(patient_id, 'view'));

-- appointments: family helpers can view
CREATE POLICY "Family helpers can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.user_has_family_permission(patient_id, 'appointments'));

-- appointments: family helpers can create
CREATE POLICY "Family helpers can create appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_family_permission(patient_id, 'appointments')
  AND created_by = auth.uid()
);

-- appointments: family helpers can update
CREATE POLICY "Family helpers can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.user_has_family_permission(patient_id, 'appointments'));