-- Fix function search path security issues
CREATE OR REPLACE FUNCTION generate_shareable_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN 'MED-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$;

CREATE OR REPLACE FUNCTION set_patient_shareable_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.shareable_id IS NULL THEN
    NEW.shareable_id = generate_shareable_id();
  END IF;
  RETURN NEW;
END;
$$;