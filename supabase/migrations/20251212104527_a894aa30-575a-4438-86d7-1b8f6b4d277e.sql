-- Update get_available_time_slots to filter past slots for today using IST
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_doctor_id uuid, p_slot_date date)
 RETURNS TABLE(slot_id uuid, start_time time without time zone, end_time time without time zone, current_bookings integer, max_appointments integer, available_slots integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_ist_time TIME;
  current_ist_date DATE;
BEGIN
  -- Get current IST time and date
  current_ist_time := (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME;
  current_ist_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
  
  RETURN QUERY
  SELECT 
    id as slot_id,
    appointment_slots.start_time,
    appointment_slots.end_time,
    COALESCE(appointment_slots.current_bookings, 0) as current_bookings,
    COALESCE(appointment_slots.max_appointments, 1) as max_appointments,
    (COALESCE(appointment_slots.max_appointments, 1) - COALESCE(appointment_slots.current_bookings, 0)) as available_slots
  FROM appointment_slots
  WHERE doctor_id = p_doctor_id
    AND slot_date = p_slot_date
    AND is_available = true
    AND COALESCE(appointment_slots.current_bookings, 0) < COALESCE(appointment_slots.max_appointments, 1)
    -- Filter out past slots if booking for today
    AND (
      p_slot_date > current_ist_date 
      OR (p_slot_date = current_ist_date AND appointment_slots.start_time > current_ist_time)
    )
  ORDER BY appointment_slots.start_time;
END;
$function$;

-- Add confirmation_deadline column to appointments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'confirmation_deadline'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN confirmation_deadline TIMESTAMPTZ;
  END IF;
END $$;

-- Create helper function to find next available slot for a doctor
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