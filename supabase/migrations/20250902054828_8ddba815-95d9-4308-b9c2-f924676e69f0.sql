-- Add content analysis columns to documents table
ALTER TABLE documents 
ADD COLUMN extracted_text TEXT,
ADD COLUMN content_keywords TEXT[],
ADD COLUMN auto_categories TEXT[],
ADD COLUMN content_confidence FLOAT DEFAULT 0.0;

-- Create indexes for efficient full-text search
CREATE INDEX IF NOT EXISTS idx_documents_extracted_text ON documents USING gin(to_tsvector('english', extracted_text));
CREATE INDEX IF NOT EXISTS idx_documents_content_keywords ON documents USING gin(content_keywords);
CREATE INDEX IF NOT EXISTS idx_documents_auto_categories ON documents USING gin(auto_categories);

-- Create content_categories table for classification taxonomy
CREATE TABLE IF NOT EXISTS content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES content_categories(id),
  medical_specialty TEXT,
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default medical categories
INSERT INTO content_categories (name, description, medical_specialty, keywords) VALUES
('Lab Results', 'Laboratory test results and reports', 'Laboratory Medicine', ARRAY['lab', 'test', 'result', 'blood', 'urine', 'culture', 'CBC', 'chemistry']),
('Imaging Reports', 'Radiology and imaging study reports', 'Radiology', ARRAY['x-ray', 'CT', 'MRI', 'ultrasound', 'scan', 'imaging', 'radiology']),
('Prescriptions', 'Medication prescriptions and pharmacy records', 'Pharmacy', ARRAY['prescription', 'medication', 'drug', 'pharmacy', 'dosage', 'pills']),
('Discharge Summaries', 'Hospital discharge and admission summaries', 'General Medicine', ARRAY['discharge', 'admission', 'summary', 'hospital', 'stay']),
('Consultation Notes', 'Doctor consultation and visit notes', 'General Medicine', ARRAY['consultation', 'visit', 'note', 'appointment', 'doctor']),
('Surgery Reports', 'Surgical procedure reports and notes', 'Surgery', ARRAY['surgery', 'operation', 'procedure', 'surgical', 'OR']),
('Pathology Reports', 'Pathology and biopsy reports', 'Pathology', ARRAY['pathology', 'biopsy', 'tissue', 'specimen', 'histology']),
('Insurance Documents', 'Insurance claims and coverage documents', 'Administration', ARRAY['insurance', 'claim', 'coverage', 'benefits', 'policy'])
ON CONFLICT (name) DO NOTHING;

-- Create document_keywords table for keyword relationships
CREATE TABLE IF NOT EXISTS document_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  keyword_type TEXT DEFAULT 'general', -- 'medical', 'general', 'condition', 'medication'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for keyword search
CREATE INDEX IF NOT EXISTS idx_document_keywords_document_id ON document_keywords(document_id);
CREATE INDEX IF NOT EXISTS idx_document_keywords_keyword ON document_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_document_keywords_type ON document_keywords(keyword_type);

-- Enable RLS on new tables
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_keywords ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_categories (public read, admin write)
CREATE POLICY "Anyone can view categories" ON content_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON content_categories FOR ALL USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- RLS policies for document_keywords
CREATE POLICY "Users can view keywords for accessible documents" ON document_keywords 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.id = document_keywords.document_id 
    AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'::user_role)
      OR EXISTS (
        SELECT 1 FROM users u, patients p 
        WHERE u.id = auth.uid() AND u.role = 'hospital_staff'::user_role 
        AND p.id = d.patient_id AND p.hospital_id = u.hospital_id
      )
      OR EXISTS (
        SELECT 1 FROM family_access fa 
        WHERE fa.patient_id = d.patient_id AND fa.user_id = auth.uid() AND fa.can_view = true
      )
    )
  )
);

-- Add trigger for updated_at on content_categories
CREATE TRIGGER update_content_categories_updated_at
BEFORE UPDATE ON content_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();