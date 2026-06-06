
-- Restrict app_config reads to authenticated users
DROP POLICY IF EXISTS "app_config readable by everyone" ON public.app_config;
CREATE POLICY "app_config readable by authenticated"
  ON public.app_config FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.app_config FROM anon;

-- Lock down hospital_admins INSERT (no self-grant of admin)
DROP POLICY IF EXISTS "System can create hospital admin records" ON public.hospital_admins;
CREATE POLICY "Only platform admins can create hospital admin records"
  ON public.hospital_admins FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- Lock down payment_history INSERT (own rows only; service_role bypasses RLS)
DROP POLICY IF EXISTS "System can insert payment records" ON public.payment_history;
CREATE POLICY "Users can insert their own payment records"
  ON public.payment_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Remove direct subscription self-insert; must go through service-role edge function
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

-- Explicit INSERT/UPDATE policy for manual_corrections scoped to caller + owned patient
DROP POLICY IF EXISTS "Users can insert their own corrections" ON public.manual_corrections;
CREATE POLICY "Users can insert their own corrections"
  ON public.manual_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_owns_patient(patient_id)
  );

DROP POLICY IF EXISTS "Users can update their own corrections" ON public.manual_corrections;
CREATE POLICY "Users can update their own corrections"
  ON public.manual_corrections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.user_owns_patient(patient_id));
