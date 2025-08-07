-- Create a trigger function to automatically set user shareable ID
CREATE OR REPLACE FUNCTION public.set_user_shareable_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_shareable_id IS NULL THEN
    NEW.user_shareable_id = generate_user_shareable_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new users
DROP TRIGGER IF EXISTS set_user_shareable_id_trigger ON users;
CREATE TRIGGER set_user_shareable_id_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_shareable_id();

-- Update existing users to have shareable IDs
UPDATE users 
SET user_shareable_id = generate_user_shareable_id() 
WHERE user_shareable_id IS NULL;