-- Add INSERT policy for hospital registration
CREATE POLICY "Authenticated users can register hospitals"
ON public.hospitals
FOR INSERT
TO authenticated
WITH CHECK (true);