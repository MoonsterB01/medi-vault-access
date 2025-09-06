-- Phase 1: Enhanced Database Schema for Hybrid Medical Document Classification

-- Add verification status and hybrid filtering columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' 
  CHECK (verification_status IN ('verified_medical', 'user_verified_medical', 'unverified', 'miscellaneous')),
ADD COLUMN IF NOT EXISTS text_density_score real DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS medical_keyword_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_verified_category text,
ADD COLUMN IF NOT EXISTS structural_cues jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS format_supported boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ocr_extracted_text text,
ADD COLUMN IF NOT EXISTS processing_notes text;

-- Create medical keywords reference table
CREATE TABLE IF NOT EXISTS medical_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  category text NOT NULL, -- 'general', 'medication', 'condition', 'procedure', 'unit', 'structure'
  weight real DEFAULT 1.0, -- importance weight for filtering
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create document feedback table for user corrections
CREATE TABLE IF NOT EXISTS document_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  original_verification_status text NOT NULL,
  corrected_verification_status text NOT NULL,
  user_assigned_category text,
  feedback_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert comprehensive medical keywords
INSERT INTO medical_keywords (keyword, category, weight) VALUES
-- General medical terms
('prescription', 'general', 2.0),
('hospital', 'general', 2.0), 
('diagnosis', 'general', 2.5),
('patient', 'general', 1.5),
('doctor', 'general', 2.0),
('physician', 'general', 2.0),
('medical', 'general', 1.5),
('report', 'general', 1.5),
('test', 'general', 2.0),
('result', 'general', 2.0),
('lab', 'general', 2.0),
('laboratory', 'general', 2.0),
('scan', 'general', 2.0),
('imaging', 'general', 2.0),
('consultation', 'general', 2.0),
('appointment', 'general', 1.5),
('clinic', 'general', 1.5),
('emergency', 'general', 2.0),
('surgery', 'general', 2.5),
('procedure', 'general', 2.0),
('treatment', 'general', 2.0),
('therapy', 'general', 2.0),

-- Body parts and systems
('heart', 'condition', 2.0),
('brain', 'condition', 2.0),
('lung', 'condition', 2.0),
('liver', 'condition', 2.0),
('kidney', 'condition', 2.0),
('blood', 'condition', 2.0),
('spine', 'condition', 2.0),
('chest', 'condition', 1.5),
('abdomen', 'condition', 1.5),

-- Common medical tests and measurements
('blood test', 'procedure', 2.5),
('urea', 'condition', 2.0),
('creatinine', 'condition', 2.0),
('glucose', 'condition', 2.0),
('cholesterol', 'condition', 2.0),
('hemoglobin', 'condition', 2.0),
('haemoglobin', 'condition', 2.0),
('hba1c', 'condition', 2.5),
('b12', 'condition', 2.0),
('vitamin', 'condition', 1.5),
('vitamins', 'condition', 1.5),
('iron', 'condition', 2.0),
('calcium', 'condition', 2.0),

-- Medical imaging
('mri', 'procedure', 2.5),
('ct scan', 'procedure', 2.5),
('x-ray', 'procedure', 2.5),
('ultrasound', 'procedure', 2.5),
('mammogram', 'procedure', 2.5),
('ecg', 'procedure', 2.5),
('ekg', 'procedure', 2.5),
('echo', 'procedure', 2.0),

-- Medical units
('mg', 'unit', 2.0),
('ml', 'unit', 1.5),
('mmhg', 'unit', 2.0),
('bpm', 'unit', 2.0),
('units', 'unit', 1.5),
('dose', 'unit', 2.0),
('dosage', 'unit', 2.0),

-- Common conditions
('diabetes', 'condition', 2.5),
('hypertension', 'condition', 2.5),
('asthma', 'condition', 2.5),
('arthritis', 'condition', 2.5),
('cancer', 'condition', 2.5),
('infection', 'condition', 2.0),
('fever', 'condition', 1.5),
('pain', 'condition', 1.5),
('allergy', 'condition', 2.0),

-- Medical specialties
('cardiology', 'general', 2.0),
('neurology', 'general', 2.0),
('oncology', 'general', 2.0),
('orthopedic', 'general', 2.0),
('dermatology', 'general', 2.0),
('psychiatry', 'general', 2.0),
('radiology', 'general', 2.0),
('pathology', 'general', 2.0),
('surgery', 'general', 2.0)

ON CONFLICT (keyword) DO UPDATE SET 
  category = EXCLUDED.category,
  weight = EXCLUDED.weight,
  updated_at = now();

-- Enable RLS for medical_keywords table
ALTER TABLE medical_keywords ENABLE ROW LEVEL SECURITY;

-- Policy for medical_keywords (readable by all authenticated users)
CREATE POLICY "Anyone can view medical keywords" 
ON medical_keywords 
FOR SELECT 
USING (true);

-- Policy for admins to manage medical keywords
CREATE POLICY "Admins can manage medical keywords" 
ON medical_keywords 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Enable RLS for document_feedback table
ALTER TABLE document_feedback ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON document_feedback 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy for users to insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON document_feedback 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy for admins to view all feedback
CREATE POLICY "Admins can view all feedback" 
ON document_feedback 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Update trigger for medical_keywords table
CREATE TRIGGER update_medical_keywords_updated_at
  BEFORE UPDATE ON medical_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_documents_medical_keyword_count ON documents(medical_keyword_count);
CREATE INDEX IF NOT EXISTS idx_documents_text_density_score ON documents(text_density_score);
CREATE INDEX IF NOT EXISTS idx_medical_keywords_category ON medical_keywords(category);
CREATE INDEX IF NOT EXISTS idx_document_feedback_document_id ON document_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_document_feedback_user_id ON document_feedback(user_id);