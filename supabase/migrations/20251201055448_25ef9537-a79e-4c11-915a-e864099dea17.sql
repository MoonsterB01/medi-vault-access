-- Assign free plan to all existing users without subscriptions
INSERT INTO public.user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end)
SELECT 
  u.id,
  sp.id,
  'monthly',
  'active',
  now(),
  now() + INTERVAL '100 years'
FROM public.users u
CROSS JOIN public.subscription_plans sp
WHERE sp.name = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us 
    WHERE us.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;