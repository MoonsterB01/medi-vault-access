-- Create a sample patient record and grant access to the current user
-- First, let's create a hospital if none exists
INSERT INTO hospitals (name, address, contact_email, verified) 
VALUES ('Demo Hospital', '123 Demo Street', 'demo@hospital.com', true)
ON CONFLICT DO NOTHING;

-- Get the hospital ID for reference
DO $$
DECLARE
    hospital_uuid uuid;
    patient_uuid uuid;
BEGIN
    -- Get or create hospital
    SELECT id INTO hospital_uuid FROM hospitals WHERE name = 'Demo Hospital' LIMIT 1;
    
    -- Create a patient record
    INSERT INTO patients (name, dob, gender, primary_contact, hospital_id, created_by)
    VALUES (
        'Demo Patient', 
        '1990-01-01', 
        'Other', 
        'demo@example.com', 
        hospital_uuid,
        'a3d61033-287d-4ae5-adba-f12d6e75daa9'
    )
    RETURNING id INTO patient_uuid;
    
    -- Grant family access to the user
    INSERT INTO family_access (patient_id, user_id, granted_by, can_view)
    VALUES (
        patient_uuid,
        'a3d61033-287d-4ae5-adba-f12d6e75daa9',
        'a3d61033-287d-4ae5-adba-f12d6e75daa9',
        true
    );
END $$;