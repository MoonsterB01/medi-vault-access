-- Allow authenticated users to view basic info of doctors
-- This is needed for displaying doctor names in hospital interfaces
CREATE POLICY "Authenticated users can view doctor profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id FROM public.doctors
  )
);