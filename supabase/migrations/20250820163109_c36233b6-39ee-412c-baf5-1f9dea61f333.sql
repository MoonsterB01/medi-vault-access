-- Add RLS policies for document deletion
-- Allow admins to delete any document
CREATE POLICY "Admins can delete any document" 
ON public.documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND role = 'admin'::user_role
));

-- Allow hospital staff to delete documents for patients in their hospital
CREATE POLICY "Hospital staff can delete documents for their patients" 
ON public.documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM users u, patients p
  WHERE u.id = auth.uid() 
  AND u.role = 'hospital_staff'::user_role 
  AND p.id = documents.patient_id 
  AND p.hospital_id = u.hospital_id
));

-- Allow patients to delete their own documents
CREATE POLICY "Patients can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM family_access fa
  WHERE fa.patient_id = documents.patient_id 
  AND fa.user_id = auth.uid() 
  AND fa.can_view = true
));