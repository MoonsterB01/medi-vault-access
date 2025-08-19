-- Fix the function search path for security
ALTER FUNCTION public.can_user_manage_patient(uuid) SET search_path = 'public';