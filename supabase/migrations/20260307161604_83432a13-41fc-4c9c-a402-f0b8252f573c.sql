
-- Create whatsapp_links table for phone-to-account mapping
CREATE TABLE public.whatsapp_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  otp_code text,
  otp_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(phone_number),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own links
CREATE POLICY "Users can view their own whatsapp links"
  ON public.whatsapp_links FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own links
CREATE POLICY "Users can insert their own whatsapp links"
  ON public.whatsapp_links FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own links
CREATE POLICY "Users can update their own whatsapp links"
  ON public.whatsapp_links FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own links
CREATE POLICY "Users can delete their own whatsapp links"
  ON public.whatsapp_links FOR DELETE
  USING (user_id = auth.uid());

-- Service role needs access for webhook processing (via service_role key bypass)
-- No additional policy needed as service_role bypasses RLS
