-- Add new columns to documents table for enhanced medical entity storage
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS extracted_entities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS medical_specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extracted_dates TEXT[] DEFAULT '{}';

-- Create index for JSONB entity searches
CREATE INDEX IF NOT EXISTS idx_documents_extracted_entities 
ON public.documents USING GIN(extracted_entities);

-- Create index for medical specialties
CREATE INDEX IF NOT EXISTS idx_documents_medical_specialties 
ON public.documents USING GIN(medical_specialties);

-- Add new columns to document_keywords table for entity categorization
ALTER TABLE public.document_keywords 
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS entity_category TEXT DEFAULT NULL;

-- Create index for entity type searches
CREATE INDEX IF NOT EXISTS idx_document_keywords_entity_type 
ON public.document_keywords(entity_type);

-- Update the document keywords RLS policy to handle new structure
DROP POLICY IF EXISTS "Users can view keywords for accessible documents" ON public.document_keywords;

CREATE POLICY "Users can view keywords for accessible documents" 
ON public.document_keywords 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_keywords.document_id 
    AND (
      -- Admin access
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'::user_role
      )
      OR
      -- Hospital staff access
      EXISTS (
        SELECT 1 FROM users u, patients p
        WHERE u.id = auth.uid() 
        AND u.role = 'hospital_staff'::user_role 
        AND p.id = d.patient_id 
        AND p.hospital_id = u.hospital_id
      )
      OR
      -- Family access
      EXISTS (
        SELECT 1 FROM family_access fa
        WHERE fa.patient_id = d.patient_id 
        AND fa.user_id = auth.uid() 
        AND fa.can_view = true
      )
    )
  )
);