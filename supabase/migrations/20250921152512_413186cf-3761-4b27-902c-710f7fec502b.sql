-- Fix doctor profile issues

-- 1. Create doctor profile for the actual doctor user (3e6ed82d-feb3-45be-9cd4-166301a8de37)
INSERT INTO public.doctors (
  user_id,
  specialization,
  qualifications,
  years_experience,
  consultation_fee,
  bio,
  is_available
) VALUES (
  '3e6ed82d-feb3-45be-9cd4-166301a8de37',
  'General Medicine',
  ARRAY['MBBS', 'MD'],
  5,
  500.00,
  'Experienced general practitioner providing comprehensive healthcare services.',
  true
);

-- 2. Update the orphaned doctor record's user to have the correct role
UPDATE public.users 
SET role = 'doctor'::user_role 
WHERE id = 'a3d61033-287d-4ae5-adba-f12d6e75daa9';

-- 3. Ensure both doctor records are properly set up
UPDATE public.doctors 
SET 
  qualifications = CASE 
    WHEN qualifications IS NULL THEN ARRAY['MBBS'] 
    ELSE qualifications 
  END,
  years_experience = CASE 
    WHEN years_experience IS NULL THEN 0 
    ELSE years_experience 
  END,
  consultation_fee = CASE 
    WHEN consultation_fee IS NULL THEN 300.00 
    ELSE consultation_fee 
  END,
  bio = CASE 
    WHEN bio IS NULL THEN 'Medical practitioner committed to providing quality healthcare.' 
    ELSE bio 
  END
WHERE qualifications IS NULL OR years_experience IS NULL OR consultation_fee IS NULL OR bio IS NULL;