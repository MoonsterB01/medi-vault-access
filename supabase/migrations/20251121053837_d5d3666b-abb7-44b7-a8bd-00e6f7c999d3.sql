-- Fix patient record creation for new users
-- First, check if the trigger and function exist and work correctly

-- Recreate the handle_patient_user function with better logic
CREATE OR REPLACE FUNCTION public.handle_patient_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_patient_id uuid;
  default_hospital_id uuid;
BEGIN
  -- Only process if this is a patient role user
  IF NEW.role = 'patient'::user_role THEN
    -- Check if patient record already exists for this user
    IF NOT EXISTS (
      SELECT 1 FROM public.patients WHERE created_by = NEW.id
    ) THEN
      -- Try to get an existing hospital, but don't fail if none exists
      SELECT id INTO default_hospital_id FROM public.hospitals LIMIT 1;
      
      -- Create a patient record (hospital_id can be NULL)
      INSERT INTO public.patients (
        name,
        dob,
        gender,
        primary_contact,
        hospital_id,
        created_by
      ) VALUES (
        NEW.name,
        CURRENT_DATE - INTERVAL '30 years', -- Default DOB, should be updated by user
        'Not Specified', -- Default gender, should be updated by user  
        NEW.email,
        default_hospital_id, -- This can be NULL
        NEW.id
      ) RETURNING id INTO new_patient_id;
      
      RAISE NOTICE 'Created patient record % for user %', new_patient_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_user_patient_created ON public.users;
CREATE TRIGGER on_user_patient_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'patient'::user_role)
  EXECUTE FUNCTION public.handle_patient_user();