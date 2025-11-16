
-- Fix existing doctor by adding hospital affiliation
UPDATE doctors 
SET hospital_affiliations = ARRAY['ebc8c47e-1783-4580-a896-9a9b026a0d82']::uuid[]
WHERE doctor_id = 'DOC-3F8FB223';

-- Insert appointment slots for the existing doctor for next 7 days
INSERT INTO appointment_slots (doctor_id, slot_date, start_time, end_time, max_appointments, is_available)
SELECT 
  'b7f5d942-e1a1-4250-b390-2f9b2727b9e0'::uuid,
  CURRENT_DATE + i,
  time_slot,
  time_slot + interval '30 minutes',
  3,
  true
FROM generate_series(0, 6) i,
  (VALUES 
    ('09:00'::time), ('09:30'::time), ('10:00'::time), ('10:30'::time), ('11:00'::time),
    ('14:00'::time), ('14:30'::time), ('15:00'::time), ('15:30'::time), ('16:00'::time)
  ) AS slots(time_slot)
ON CONFLICT DO NOTHING;

-- Create sample doctor users and doctors
DO $$
DECLARE
  user1_id uuid := gen_random_uuid();
  user2_id uuid := gen_random_uuid();
  user3_id uuid := gen_random_uuid();
  doctor1_id uuid := gen_random_uuid();
  doctor2_id uuid := gen_random_uuid();
  doctor3_id uuid := gen_random_uuid();
BEGIN
  -- Insert users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES 
    (user1_id, 'dr.smith@hospital.com', crypt('password123', gen_salt('bf')), now(), 
     jsonb_build_object('name', 'Dr. Sarah Smith', 'role', 'doctor'), now(), now()),
    (user2_id, 'dr.jones@hospital.com', crypt('password123', gen_salt('bf')), now(), 
     jsonb_build_object('name', 'Dr. Michael Jones', 'role', 'doctor'), now(), now()),
    (user3_id, 'dr.patel@hospital.com', crypt('password123', gen_salt('bf')), now(), 
     jsonb_build_object('name', 'Dr. Priya Patel', 'role', 'doctor'), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert public users
  INSERT INTO public.users (id, email, name, role)
  VALUES 
    (user1_id, 'dr.smith@hospital.com', 'Dr. Sarah Smith', 'doctor'),
    (user2_id, 'dr.jones@hospital.com', 'Dr. Michael Jones', 'doctor'),
    (user3_id, 'dr.patel@hospital.com', 'Dr. Priya Patel', 'doctor')
  ON CONFLICT (id) DO NOTHING;

  -- Insert doctors
  INSERT INTO doctors (id, user_id, doctor_id, specialization, qualifications, bio, years_experience, consultation_fee, is_available, hospital_affiliations)
  VALUES 
    (doctor1_id, user1_id, 'DOC-' || upper(substring(gen_random_uuid()::text, 1, 8)), 
     'Cardiology', ARRAY['MBBS', 'MD', 'DM Cardiology'], 
     'Specialist in heart conditions and cardiovascular diseases', 12, 1500.00, true,
     ARRAY['ebc8c47e-1783-4580-a896-9a9b026a0d82']::uuid[]),
    (doctor2_id, user2_id, 'DOC-' || upper(substring(gen_random_uuid()::text, 1, 8)), 
     'Orthopedics', ARRAY['MBBS', 'MS Orthopedics'], 
     'Expert in bone and joint treatments', 8, 1200.00, true,
     ARRAY['ebc8c47e-1783-4580-a896-9a9b026a0d82']::uuid[]),
    (doctor3_id, user3_id, 'DOC-' || upper(substring(gen_random_uuid()::text, 1, 8)), 
     'Pediatrics', ARRAY['MBBS', 'MD Pediatrics'], 
     'Specialized in child healthcare', 10, 1000.00, true,
     ARRAY['ebc8c47e-1783-4580-a896-9a9b026a0d82']::uuid[])
  ON CONFLICT (id) DO NOTHING;

  -- Add appointment slots for all new doctors
  INSERT INTO appointment_slots (doctor_id, slot_date, start_time, end_time, max_appointments, is_available)
  SELECT 
    doctor_id,
    CURRENT_DATE + i,
    time_slot,
    time_slot + interval '30 minutes',
    2,
    true
  FROM (VALUES (doctor1_id), (doctor2_id), (doctor3_id)) AS docs(doctor_id),
       generate_series(0, 6) i,
       (VALUES 
         ('09:00'::time), ('09:30'::time), ('10:00'::time), ('10:30'::time), ('11:00'::time),
         ('14:00'::time), ('14:30'::time), ('15:00'::time), ('15:30'::time), ('16:00'::time), ('16:30'::time)
       ) AS slots(time_slot)
  ON CONFLICT DO NOTHING;
END $$;
