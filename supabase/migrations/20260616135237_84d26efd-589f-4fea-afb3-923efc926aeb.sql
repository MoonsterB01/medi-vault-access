
-- 1. payment_history: remove user INSERT policy. service_role bypasses RLS.
DROP POLICY IF EXISTS "Users can insert their own payment records" ON public.payment_history;

-- 2. user_subscriptions: remove user UPDATE policy. No INSERT policy for users.
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- 3. user_roles: add explicit RESTRICTIVE policy so only admins can write.
-- The existing "Admins can manage all roles" permissive policy already restricts,
-- but we add a restrictive policy for defense-in-depth against future permissive policies.
DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;
CREATE POLICY "Only admins can modify roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
