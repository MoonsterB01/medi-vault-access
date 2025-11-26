-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  yearly_price INTEGER NOT NULL DEFAULT 0,
  upload_limit INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payment history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.user_subscriptions(id),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- RLS Policies for user_subscriptions (users can only see their own)
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for payment_history (users can only see their own)
CREATE POLICY "Users can view their own payment history"
ON public.payment_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert payment records"
ON public.payment_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, display_name, monthly_price, yearly_price, upload_limit, features) VALUES
('free', 'Free', 0, 0, 5, '["5 document uploads", "Basic OCR", "Document search", "AI summaries"]'::jsonb),
('basic', 'Basic', 10000, 110000, 20, '["20 document uploads", "All Free features", "Priority support"]'::jsonb),
('standard', 'Standard', 20000, 220000, 50, '["50 document uploads", "All Basic features", "Family sharing (2 members)"]'::jsonb),
('premium', 'Premium', 50000, 500000, 100, '["100 document uploads", "All Standard features", "Family sharing (5 members)", "24/7 support"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Trigger to auto-assign free plan to new users
CREATE OR REPLACE FUNCTION public.assign_free_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, billing_cycle, status, current_period_start, current_period_end)
  SELECT NEW.id, sp.id, 'monthly', 'active', now(), now() + INTERVAL '100 years'
  FROM public.subscription_plans sp
  WHERE sp.name = 'free'
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_free_plan_to_new_user
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_free_plan();

-- Function to get user's upload limit
CREATE OR REPLACE FUNCTION public.get_user_upload_limit(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT sp.upload_limit INTO v_limit
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
  AND us.status = 'active';
  
  RETURN COALESCE(v_limit, 5); -- Default to free plan limit
END;
$$;