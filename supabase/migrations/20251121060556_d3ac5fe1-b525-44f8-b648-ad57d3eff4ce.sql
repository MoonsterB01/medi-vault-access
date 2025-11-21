-- Phase 1: Create Security Definer Functions to Break Circular Dependencies
-- These functions bypass RLS and prevent infinite recursion
-- Using public schema since we cannot modify auth schema

-- Function to check if current user owns a patient
CREATE OR REPLACE FUNCTION public.user_owns_patient(patient_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = patient_id_param
    AND created_by = auth.uid()
  );
$$;

-- Function to get all patient IDs owned by current user
CREATE OR REPLACE FUNCTION public.get_user_patient_ids()
RETURNS TABLE(patient_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patients
  WHERE created_by = auth.uid();
$$;

-- Function to check if hospital staff can view a patient
CREATE OR REPLACE FUNCTION public.hospital_staff_can_view_patient(patient_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.patients p ON p.hospital_id = u.hospital_id
    WHERE u.id = auth.uid()
    AND u.role = 'hospital_staff'::user_role
    AND p.id = patient_id_param
    AND u.hospital_id IS NOT NULL
  );
$$;

-- Function to check if user can view patient via appointments (cross-hospital access)
CREATE OR REPLACE FUNCTION public.can_view_patient_via_appointments(patient_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE a.patient_id = patient_id_param
    AND u.role = 'hospital_staff'::user_role
    AND u.hospital_id = ANY(d.hospital_affiliations)
  );
$$;

-- Phase 2: Drop Circular RLS Policies
-- These policies were causing infinite recursion

DROP POLICY IF EXISTS "Users can view appointments for their patients" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments for their patients" ON public.appointments;
DROP POLICY IF EXISTS "Hospital staff can view patients with appointments at affiliate" ON public.patients;

-- Phase 3: Create New Non-Circular RLS Policies
-- Using security definer functions to prevent recursion

-- Appointments table policies (using security definer functions)
CREATE POLICY "Users can view appointments for their patients v2"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
);

CREATE POLICY "Users can update appointments for their patients v2"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
);

-- Patients table policies (using security definer functions)
CREATE POLICY "Hospital staff can view their hospital patients v2"
ON public.patients
FOR SELECT
TO authenticated
USING (
  public.hospital_staff_can_view_patient(id)
);

CREATE POLICY "Hospital staff can view patients via appointments v2"
ON public.patients
FOR SELECT
TO authenticated
USING (
  public.can_view_patient_via_appointments(id)
);

-- Phase 4: Add Database Performance Optimizations
-- Indexes to speed up common queries

-- Index for patient ownership lookups
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by);

-- Index for appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_doctor ON public.appointments(patient_id, doctor_id);

-- Index for hospital staff queries
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON public.users(hospital_id) WHERE hospital_id IS NOT NULL;

-- Index for doctor affiliations (for faster array searches)
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_affiliations ON public.doctors USING GIN(hospital_affiliations);

-- Phase 5: Add helper function for appointment access check
CREATE OR REPLACE FUNCTION public.can_access_appointment(appointment_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id_param
    AND (
      -- User owns the patient
      a.patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
      OR
      -- User is the doctor
      a.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
      OR
      -- User is hospital staff with access
      public.hospital_staff_can_view_patient(a.patient_id)
    )
  );
$$;

COMMENT ON FUNCTION public.user_owns_patient IS 'Check if current user owns a patient record (bypasses RLS)';
COMMENT ON FUNCTION public.get_user_patient_ids IS 'Get all patient IDs owned by current user (bypasses RLS)';
COMMENT ON FUNCTION public.hospital_staff_can_view_patient IS 'Check if hospital staff can view patient (bypasses RLS)';
COMMENT ON FUNCTION public.can_view_patient_via_appointments IS 'Check if user can view patient via appointments (bypasses RLS)';
COMMENT ON FUNCTION public.can_access_appointment IS 'Check if user can access an appointment (bypasses RLS)';