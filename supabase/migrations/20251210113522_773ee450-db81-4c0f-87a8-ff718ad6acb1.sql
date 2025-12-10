-- Create a public function to get aggregate stats (no sensitive data exposed)
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(documents_count bigint, patients_count bigint, hospitals_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM documents) as documents_count,
    (SELECT COUNT(*) FROM patients) as patients_count,
    (SELECT COUNT(*) FROM hospitals) as hospitals_count;
$$;