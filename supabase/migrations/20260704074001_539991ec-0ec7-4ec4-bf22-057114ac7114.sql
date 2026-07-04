
-- 1) payment_history & user_subscriptions: restrict writes to service_role only
REVOKE INSERT, UPDATE, DELETE ON public.payment_history FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM authenticated, anon;
GRANT ALL ON public.payment_history TO service_role;
GRANT ALL ON public.user_subscriptions TO service_role;

-- Add explicit restrictive policies so intent is clear (service_role bypasses RLS)
CREATE POLICY "Deny direct writes to payment_history"
  ON public.payment_history AS RESTRICTIVE FOR ALL
  TO authenticated, anon
  USING (false) WITH CHECK (false);

-- Keep the existing SELECT permissive policy working alongside RESTRICTIVE; restrictive only blocks writes here because SELECT is filtered by USING(false) too.
-- Split: allow SELECT via permissive, block writes via restrictive on non-SELECT commands using separate policies.
DROP POLICY "Deny direct writes to payment_history" ON public.payment_history;

CREATE POLICY "Deny insert payment_history" ON public.payment_history AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny update payment_history" ON public.payment_history AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "Deny delete payment_history" ON public.payment_history AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "Deny insert user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny update user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "Deny delete user_subscriptions" ON public.user_subscriptions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 2) hospitals: remove open INSERT policy (admin ALL policy remains)
DROP POLICY IF EXISTS "Authenticated users can register hospitals" ON public.hospitals;

-- 3) users: prevent self-escalation of role and hospital_id via trigger
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / definer contexts (no auth.uid()) or admins to change privileged columns
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;
  IF NEW.hospital_id IS DISTINCT FROM OLD.hospital_id THEN
    RAISE EXCEPTION 'Not allowed to change hospital_id';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Not allowed to change id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_privilege_escalation_trg ON public.users;
CREATE TRIGGER prevent_user_privilege_escalation_trg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();
