-- Add shareable_id to patients table for document sharing
ALTER TABLE patients ADD COLUMN IF NOT EXISTS shareable_id TEXT UNIQUE;

-- Generate unique shareable IDs for existing patients
UPDATE patients 
SET shareable_id = 'MED-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))
WHERE shareable_id IS NULL;

-- Create function to generate shareable ID for new patients
CREATE OR REPLACE FUNCTION generate_shareable_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'MED-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-generate shareable_id for new patients
CREATE OR REPLACE FUNCTION set_patient_shareable_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shareable_id IS NULL THEN
    NEW.shareable_id = generate_shareable_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_shareable_id 
  BEFORE INSERT ON patients 
  FOR EACH ROW 
  EXECUTE FUNCTION set_patient_shareable_id();

-- Create documents table for better search and metadata
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  document_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tags TEXT[],
  searchable_content TEXT -- For full-text search
);

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view documents they have access to" 
ON documents FOR SELECT 
USING (
  -- Admin can see all
  (SELECT get_user_role(auth.uid()) = 'admin') OR
  -- Hospital staff can see their hospital's patient documents
  (
    get_user_role(auth.uid()) = 'hospital_staff' AND 
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = documents.patient_id 
      AND p.hospital_id = get_user_hospital(auth.uid())
    )
  ) OR
  -- Family members can see documents for patients they have access to
  (
    get_user_role(auth.uid()) IN ('family_member', 'patient') AND
    EXISTS (
      SELECT 1 FROM family_access fa
      WHERE fa.patient_id = documents.patient_id 
      AND fa.user_id = auth.uid() 
      AND fa.can_view = true
    )
  )
);

CREATE POLICY "Hospital staff can upload documents for their patients"
ON documents FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'hospital_staff' AND
  EXISTS (
    SELECT 1 FROM patients p 
    WHERE p.id = documents.patient_id 
    AND p.hospital_id = get_user_hospital(auth.uid())
  )
);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-documents', 'medical-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical documents
CREATE POLICY "Users can view documents they have access to" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'medical-documents' AND
  (
    -- Admin can see all
    (SELECT get_user_role(auth.uid()) = 'admin') OR
    -- Hospital staff can see their hospital's patient documents
    (
      get_user_role(auth.uid()) = 'hospital_staff' AND 
      EXISTS (
        SELECT 1 FROM documents d
        JOIN patients p ON p.id = d.patient_id
        WHERE d.file_path = storage.objects.name
        AND p.hospital_id = get_user_hospital(auth.uid())
      )
    ) OR
    -- Family members can see documents for patients they have access to
    (
      get_user_role(auth.uid()) IN ('family_member', 'patient') AND
      EXISTS (
        SELECT 1 FROM documents d
        JOIN family_access fa ON fa.patient_id = d.patient_id
        WHERE d.file_path = storage.objects.name
        AND fa.user_id = auth.uid() 
        AND fa.can_view = true
      )
    )
  )
);

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medical-documents' AND auth.role() = 'authenticated');

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_patients_shareable_id ON patients(shareable_id);