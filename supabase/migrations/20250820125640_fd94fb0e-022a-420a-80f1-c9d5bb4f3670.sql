-- Add uploaded_by_user_shareable_id column for better traceability
ALTER TABLE public.documents 
ADD COLUMN uploaded_by_user_shareable_id text;

-- Add index for better performance on family_access queries
CREATE INDEX idx_family_access_user_patient ON public.family_access(user_id, patient_id);
CREATE INDEX idx_documents_uploaded_by_shareable ON public.documents(uploaded_by_user_shareable_id);

-- Update documents table to make uploaded_by not nullable (should always track who uploaded)
ALTER TABLE public.documents 
ALTER COLUMN uploaded_by SET NOT NULL;