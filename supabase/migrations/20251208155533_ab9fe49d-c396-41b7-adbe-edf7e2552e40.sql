-- Update the handle_patient_user function to use gender and dob from user metadata
CREATE OR REPLACE FUNCTION public.handle_patient_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_patient_id uuid;
  default_hospital_id uuid;
  user_gender text;
  user_dob date;
BEGIN
  -- Only process if this is a patient role user
  IF NEW.role = 'patient'::user_role THEN
    -- Check if patient record already exists for this user
    IF NOT EXISTS (
      SELECT 1 FROM public.patients WHERE created_by = NEW.id
    ) THEN
      -- Try to get an existing hospital, but don't fail if none exists
      SELECT id INTO default_hospital_id FROM public.hospitals LIMIT 1;
      
      -- Get gender from auth.users metadata
      SELECT COALESCE(
        (SELECT raw_user_meta_data->>'gender' FROM auth.users WHERE id = NEW.id),
        'Not Specified'
      ) INTO user_gender;
      
      -- Get dob from auth.users metadata
      SELECT COALESCE(
        (SELECT (raw_user_meta_data->>'dob')::date FROM auth.users WHERE id = NEW.id),
        CURRENT_DATE - INTERVAL '30 years'
      )::date INTO user_dob;
      
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
        user_dob,
        user_gender,
        NEW.email,
        default_hospital_id,
        NEW.id
      ) RETURNING id INTO new_patient_id;
      
      RAISE NOTICE 'Created patient record % for user %', new_patient_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;