-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'family_member'::user_role),
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user record when someone signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert record for the existing user who doesn't have a record yet
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
VALUES (
  'a3d61033-287d-4ae5-adba-f12d6e75daa9',
  'mrigankagarwal810@gmail.com',
  'Mrigank',
  'family_member'::user_role,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;