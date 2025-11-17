-- Ensure admins can also manage slots (covers admin testers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'appointment_slots' 
      AND policyname = 'Admins can manage slots'
  ) THEN
    CREATE POLICY "Admins can manage slots"
    ON public.appointment_slots
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'::user_role
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'::user_role
      )
    );
  END IF;
END$$;