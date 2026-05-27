
-- 1. Users table: remove doctor-email exposure
DROP POLICY IF EXISTS "Authenticated users can view doctor profiles" ON public.users;

-- 2. family_access: remove user-controlled INSERT (privilege escalation)
DROP POLICY IF EXISTS "Family member can create their own access link" ON public.family_access;
-- Keep: patient owner SELECT/UPDATE/DELETE, family_user SELECT/DELETE (leave), service_role bypass

-- 3. notifications: tighten INSERT
DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;
CREATE POLICY "Users can create notifications for themselves"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
-- service_role bypasses RLS, so create_notification() and edge functions still work.

-- 4. file_hashes: restrict reads to admins only
DROP POLICY IF EXISTS "Authenticated users can view file hashes" ON public.file_hashes;
CREATE POLICY "Admins can view file hashes"
  ON public.file_hashes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 5. billing: let patients read their own bills
CREATE POLICY "Patients can view their own billing"
  ON public.billing
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
  );

-- 6a. ipd_admissions: let patients read their own admissions
CREATE POLICY "Patients can view their own IPD admissions"
  ON public.ipd_admissions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
  );

-- 6b. opd_visits: let patients read their own visits
CREATE POLICY "Patients can view their own OPD visits"
  ON public.opd_visits
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT patient_id FROM public.get_user_patient_ids())
  );

-- 7. Pin search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
