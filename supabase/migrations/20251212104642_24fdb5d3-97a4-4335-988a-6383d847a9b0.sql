-- Fix search_path for find_next_available_slot function
CREATE OR REPLACE FUNCTION public.find_next_available_slot(
  p_doctor_id uuid,
  p_min_date date DEFAULT NULL
)
RETURNS TABLE(
  slot_id uuid,
  slot_date date,
  start_time time without time zone,
  end_time time without time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  search_date DATE;
  current_ist_date DATE;
BEGIN
  current_ist_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  search_date := GREATEST(COALESCE(p_min_date, current_ist_date + 1), current_ist_date + 1);
  
  RETURN QUERY
  SELECT 
    s.id as slot_id,
    s.slot_date,
    s.start_time,
    s.end_time
  FROM appointment_slots s
  WHERE s.doctor_id = p_doctor_id
    AND s.slot_date >= search_date
    AND s.is_available = true
    AND COALESCE(s.current_bookings, 0) < COALESCE(s.max_appointments, 1)
  ORDER BY s.slot_date, s.start_time
  LIMIT 1;
END;
$function$;