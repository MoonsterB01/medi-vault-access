-- Phase 1: Enhanced Database Schema for Hybrid Medical Document Classification (Policy Fix)

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
  category text NOT NULL,
  weight real DEFAULT 1.0,
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

-- Insert medical keywords (avoiding duplicates)
INSERT INTO medical_keywords (keyword, category, weight) 
SELECT * FROM (VALUES
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
  ('procedure', 'general', 2.0),
  ('treatment', 'general', 2.0),
  ('therapy', 'general', 2.0),
  ('heart', 'condition', 2.0),
  ('brain', 'condition', 2.0),
  ('blood', 'condition', 2.0),
  ('urea', 'condition', 2.0),
  ('glucose', 'condition', 2.0),
  ('hemoglobin', 'condition', 2.0),
  ('hba1c', 'condition', 2.5),
  ('b12', 'condition', 2.0),
  ('vitamin', 'condition', 1.5),
  ('mri', 'procedure', 2.5),
  ('x-ray', 'procedure', 2.5),
  ('ultrasound', 'procedure', 2.5),
  ('ecg', 'procedure', 2.5),
  ('mg', 'unit', 2.0),
  ('mmhg', 'unit', 2.0),
  ('diabetes', 'condition', 2.5),
  ('hypertension', 'condition', 2.5),
  ('asthma', 'condition', 2.5),
  ('cancer', 'condition', 2.5),
  ('cardiology', 'general', 2.0),
  ('neurology', 'general', 2.0),
  ('oncology', 'general', 2.0)
) AS v(keyword, category, weight) 
WHERE NOT EXISTS (
  SELECT 1 FROM medical_keywords mk WHERE mk.keyword = v.keyword
);

-- Enable RLS
ALTER TABLE medical_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (ignore errors)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view medical keywords" ON medical_keywords;
  DROP POLICY IF EXISTS "Admins can manage medical keywords" ON medical_keywords;
  DROP POLICY IF EXISTS "Users can view their own feedback" ON document_feedback;
  DROP POLICY IF EXISTS "Users can insert their own feedback" ON document_feedback;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "Anyone can view medical keywords" 
ON medical_keywords FOR SELECT USING (true);

CREATE POLICY "Admins can manage medical keywords" 
ON medical_keywords FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own feedback" 
ON document_feedback FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback" 
ON document_feedback FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_medical_keywords_category ON medical_keywords(category);