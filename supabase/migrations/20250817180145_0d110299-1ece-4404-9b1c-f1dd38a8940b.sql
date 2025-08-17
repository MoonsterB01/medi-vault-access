-- Create a function to automatically create patient record and family access when a user signs up as a patient
CREATE OR REPLACE FUNCTION public.handle_patient_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_patient_id uuid;
BEGIN
  -- Only process if this is a patient role user
  IF NEW.role = 'patient'::user_role THEN
    -- Create a patient record with the same name and a default hospital (you may need to adjust this)
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
      'Unknown', -- Default gender, should be updated by user  
      NEW.email,
      (SELECT id FROM public.hospitals LIMIT 1), -- Use first available hospital
      NEW.id
    ) RETURNING id INTO new_patient_id;

    -- Create family access record linking the user to their patient record
    INSERT INTO public.family_access (
      user_id,
      patient_id,
      can_view,
      granted_by
    ) VALUES (
      NEW.id,
      new_patient_id,
      true,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create patient records for patient users
DROP TRIGGER IF EXISTS on_patient_user_created ON public.users;
CREATE TRIGGER on_patient_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW 
  WHEN (NEW.role = 'patient'::user_role)
  EXECUTE FUNCTION public.handle_patient_user();

-- Fix existing patient users who don't have patient records
DO $$
DECLARE
  user_record RECORD;
  new_patient_id uuid;
  default_hospital_id uuid;
BEGIN
  -- Get a default hospital ID
  SELECT id INTO default_hospital_id FROM public.hospitals LIMIT 1;
  
  -- If no hospital exists, create a default one
  IF default_hospital_id IS NULL THEN
    INSERT INTO public.hospitals (name, address, contact_email, verified)
    VALUES ('Default Hospital', 'Default Address', 'admin@hospital.com', true)
    RETURNING id INTO default_hospital_id;
  END IF;

  -- Process each patient user who doesn't have a patient record
  FOR user_record IN 
    SELECT u.id, u.name, u.email
    FROM public.users u
    LEFT JOIN public.family_access fa ON fa.user_id = u.id
    WHERE u.role = 'patient'::user_role 
    AND fa.user_id IS NULL
  LOOP
    -- Create patient record
    INSERT INTO public.patients (
      name,
      dob,
      gender,
      primary_contact,
      hospital_id,
      created_by
    ) VALUES (
      user_record.name,
      CURRENT_DATE - INTERVAL '30 years', -- Default DOB
      'Unknown', -- Default gender
      user_record.email,
      default_hospital_id,
      user_record.id
    ) RETURNING id INTO new_patient_id;

    -- Create family access record
    INSERT INTO public.family_access (
      user_id,
      patient_id,
      can_view,
      granted_by
    ) VALUES (
      user_record.id,
      new_patient_id,
      true,
      user_record.id
    );
  END LOOP;
END $$;