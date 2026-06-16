
-- 1. Update user_can_access_patient_files to include family_access grants
CREATE OR REPLACE FUNCTION public.user_can_access_patient_files(user_id_param uuid, patient_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF patient_id_param IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id_param 
    AND role = 'admin'::user_role
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Owner of patient
  IF EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = patient_id_param
    AND created_by = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Hospital staff for this patient's hospital
  IF EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.patients p ON p.hospital_id = u.hospital_id
    WHERE u.id = user_id_param
    AND u.role = 'hospital_staff'::user_role
    AND p.id = patient_id_param
    AND u.hospital_id IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Family access grant (active, not revoked)
  IF EXISTS (
    SELECT 1 FROM public.family_access
    WHERE family_user_id = user_id_param
      AND patient_id = patient_id_param
      AND is_active = true
      AND revoked_at IS NULL
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- 2. Revoke EXECUTE from anon (and PUBLIC) on all SECURITY DEFINER functions in public,
--    EXCEPT get_public_stats which is intentionally exposed for unauthenticated trust metrics.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> 'get_public_stats'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;',
      fn.nspname, fn.proname, fn.args);
  END LOOP;
END$$;
