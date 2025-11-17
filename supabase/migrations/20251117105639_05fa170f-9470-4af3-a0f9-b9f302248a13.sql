-- Add missing SELECT policies for documents table to allow users to view their uploaded documents

-- Policy 1: Users can view documents for patients they created (1:1 model)
CREATE POLICY "Users can view their own patient documents"
ON documents
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);

-- Policy 2: Hospital staff can view documents for their hospital's patients
CREATE POLICY "Hospital staff can view documents for their patients"
ON documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u, patients p
    WHERE u.id = auth.uid()
    AND u.role = 'hospital_staff'::user_role
    AND p.id = documents.patient_id
    AND p.hospital_id = u.hospital_id
  )
);

-- Policy 3: Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
);

-- Policy 4: Users can upload documents for their own patient record
CREATE POLICY "Users can upload documents for their own patient"
ON documents
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);

-- Policy 5: Users can update their own documents
CREATE POLICY "Users can update their own patient documents"
ON documents
FOR UPDATE
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);