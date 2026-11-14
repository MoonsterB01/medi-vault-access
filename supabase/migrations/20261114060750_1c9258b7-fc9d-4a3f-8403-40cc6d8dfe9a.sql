DROP POLICY IF EXISTS "Authenticated users can insert file hashes" ON public.file_hashes;
DROP POLICY IF EXISTS "Users can update file hashes they've seen" ON public.file_hashes;

DROP POLICY IF EXISTS "app_config readable by authenticated" ON public.app_config;
CREATE POLICY "Authenticated users can read WhatsApp business number"
ON public.app_config
FOR SELECT
TO authenticated
USING (key = 'whatsapp_business_number');

DROP POLICY IF EXISTS "Authenticated users can view hospitals" ON public.hospitals;
CREATE POLICY "Authenticated users can view verified hospitals"
ON public.hospitals
FOR SELECT
TO authenticated
USING (verified IS TRUE);

DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;
CREATE POLICY "Authenticated users can view available doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (is_available IS TRUE);