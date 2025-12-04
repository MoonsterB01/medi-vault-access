-- Add INSERT policy for users to create their own patient record
CREATE POLICY "Users can create their own patient"
ON public.patients
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Clean up duplicate family_member role entries
DELETE FROM public.user_roles 
WHERE role = 'family_member'::user_role;

-- Create patient record for the user who is missing it
INSERT INTO public.patients (name, dob, gender, primary_contact, created_by)
SELECT 
  u.name,
  CURRENT_DATE - INTERVAL '30 years',
  'Not Specified',
  u.email,
  u.id
FROM public.users u
WHERE u.email = 'purposeshospital@gmail.com'
AND u.role = 'patient'
AND NOT EXISTS (
  SELECT 1 FROM public.patients p WHERE p.created_by = u.id
);