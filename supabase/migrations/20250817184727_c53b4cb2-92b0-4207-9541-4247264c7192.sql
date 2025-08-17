-- Update existing documents to have a valid uploaded_by field
-- Use the first user ID we found for existing documents that don't have uploaded_by set
UPDATE documents 
SET uploaded_by = 'a3d61033-287d-4ae5-adba-f12d6e75daa9'
WHERE uploaded_by IS NULL;