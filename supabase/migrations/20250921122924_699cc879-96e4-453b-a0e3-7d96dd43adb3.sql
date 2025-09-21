-- Fix RLS policy for doctor registration
-- Add specific INSERT policy for doctors to create their own profile

CREATE POLICY "Users can create their own doctor profile"
ON public.doctors
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Also update the existing policy to be more specific
DROP POLICY IF EXISTS "Doctors can view and update their own profile" ON public.doctors;

CREATE POLICY "Doctors can view and update their own profile"
ON public.doctors
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Doctors can update their own profile"
ON public.doctors
FOR UPDATE
USING (user_id = auth.uid());