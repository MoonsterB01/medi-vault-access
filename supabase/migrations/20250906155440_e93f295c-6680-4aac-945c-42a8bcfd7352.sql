-- Add file hash system and blocked files tracking
CREATE TABLE IF NOT EXISTS public.file_hashes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash TEXT UNIQUE NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  first_uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocked_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_hash TEXT NOT NULL REFERENCES public.file_hashes(file_hash),
  blocked_by UUID NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT DEFAULT 'not_medical',
  user_feedback TEXT,
  similarity_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add file_hash column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_hashes_hash ON public.file_hashes(file_hash);
CREATE INDEX IF NOT EXISTS idx_blocked_files_hash ON public.blocked_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_blocked_files_blocked_by ON public.blocked_files(blocked_by);

-- Enable RLS on new tables
ALTER TABLE public.file_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_hashes
CREATE POLICY "Anyone can view file hashes" 
ON public.file_hashes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert file hashes" 
ON public.file_hashes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update file hashes they've seen" 
ON public.file_hashes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for blocked_files
CREATE POLICY "Users can view blocked files they created" 
ON public.blocked_files 
FOR SELECT 
USING (blocked_by = auth.uid());

CREATE POLICY "Admins can view all blocked files" 
ON public.blocked_files 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Hospital staff can view blocked files for their patients" 
ON public.blocked_files 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'hospital_staff'::user_role AND 
  EXISTS (
    SELECT 1 FROM documents d, patients p 
    WHERE d.file_hash = blocked_files.file_hash 
    AND p.id = d.patient_id 
    AND p.hospital_id = get_user_hospital(auth.uid())
  )
);

CREATE POLICY "Users can block files" 
ON public.blocked_files 
FOR INSERT 
WITH CHECK (blocked_by = auth.uid());

CREATE POLICY "Users can update their own blocked files" 
ON public.blocked_files 
FOR UPDATE 
USING (blocked_by = auth.uid());

-- Function to generate SHA-256 hash (placeholder for client-side implementation)
CREATE OR REPLACE FUNCTION public.register_file_hash(
  hash_input TEXT,
  filename_input TEXT,
  size_input INTEGER,
  content_type_input TEXT
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to check if file is blocked
CREATE OR REPLACE FUNCTION public.is_file_blocked(hash_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_files 
    WHERE file_hash = hash_input
  );
END;
$$;