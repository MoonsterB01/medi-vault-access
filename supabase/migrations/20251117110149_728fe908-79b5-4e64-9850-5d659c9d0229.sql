-- Fix missing policies for patient document deletion and patient summary viewing

-- Policy 1: Users can delete their own patient documents
CREATE POLICY "Users can delete their own patient documents"
ON documents
FOR DELETE
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);

-- Policy 2: Users can view their own patient summary
CREATE POLICY "Users can view their own patient summary"
ON patient_summaries
FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM patients 
    WHERE created_by = auth.uid()
  )
);