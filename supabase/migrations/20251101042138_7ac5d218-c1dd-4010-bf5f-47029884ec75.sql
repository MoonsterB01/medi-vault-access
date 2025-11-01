-- Add new columns to documents table for AI summaries
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS summary_confidence REAL,
ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- Add new columns to patients table for missing info detection
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
ADD COLUMN IF NOT EXISTS medical_notes TEXT;