-- Update the handle_new_user trigger to default to 'patient' instead of 'family_member'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient'::user_role),
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- Fix any existing users with family_member role to be patient
UPDATE public.users 
SET role = 'patient' 
WHERE role = 'family_member';