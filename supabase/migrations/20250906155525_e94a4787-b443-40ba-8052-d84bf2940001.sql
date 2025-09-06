-- Fix security issues by setting search_path for functions
CREATE OR REPLACE FUNCTION public.register_file_hash(
  hash_input TEXT,
  filename_input TEXT,
  size_input INTEGER,
  content_type_input TEXT
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
  new_id UUID;
BEGIN
  -- Check if hash already exists
  SELECT id INTO existing_id 
  FROM public.file_hashes 
  WHERE file_hash = hash_input;
  
  IF existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE public.file_hashes 
    SET 
      last_seen_at = now(),
      upload_count = upload_count + 1
    WHERE id = existing_id;
    RETURN existing_id;
  ELSE
    -- Insert new record
    INSERT INTO public.file_hashes (
      file_hash,
      original_filename,
      file_size,
      content_type
    ) VALUES (
      hash_input,
      filename_input,
      size_input,
      content_type_input
    ) RETURNING id INTO new_id;
    RETURN new_id;
  END IF;
END;
$$;

-- Fix search_path for is_file_blocked function
CREATE OR REPLACE FUNCTION public.is_file_blocked(hash_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_files 
    WHERE file_hash = hash_input
  );
END;
$$;