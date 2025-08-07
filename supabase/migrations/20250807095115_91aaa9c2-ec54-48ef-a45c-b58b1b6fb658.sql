-- Add a unique shareable ID to all users
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_shareable_id text;

-- Create a function to generate user shareable IDs
CREATE OR REPLACE FUNCTION public.generate_user_shareable_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN 'USER-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$;