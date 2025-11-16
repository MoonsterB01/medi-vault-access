-- Phase 1: Appointment Slot Management System

-- Create SQL functions for slot management
CREATE OR REPLACE FUNCTION public.check_slot_availability(
  p_doctor_id uuid,
  p_slot_date date,
  p_start_time time
)
RETURNS TABLE (
  available boolean,
  current_bookings integer,
  max_appointments integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (COALESCE(current_bookings, 0) < COALESCE(max_appointments, 1)) as available,
    COALESCE(current_bookings, 0) as current_bookings,
    COALESCE(max_appointments, 1) as max_appointments
  FROM appointment_slots
  WHERE doctor_id = p_doctor_id
    AND slot_date = p_slot_date
    AND start_time = p_start_time
    AND is_available = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_doctor_id uuid,
  p_slot_date date
)
RETURNS TABLE (
  slot_id uuid,
  start_time time,
  end_time time,
  current_bookings integer,
  max_appointments integer,
  available_slots integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as slot_id,
    start_time,
    end_time,
    COALESCE(current_bookings, 0) as current_bookings,
    COALESCE(max_appointments, 1) as max_appointments,
    (COALESCE(max_appointments, 1) - COALESCE(current_bookings, 0)) as available_slots
  FROM appointment_slots
  WHERE doctor_id = p_doctor_id
    AND slot_date = p_slot_date
    AND is_available = true
    AND COALESCE(current_bookings, 0) < COALESCE(max_appointments, 1)
  ORDER BY start_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_slot_booking(
  p_doctor_id uuid,
  p_slot_date date,
  p_start_time time
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id uuid;
  v_current_bookings integer;
  v_max_appointments integer;
BEGIN
  -- Get slot with row lock
  SELECT id, current_bookings, max_appointments
  INTO v_slot_id, v_current_bookings, v_max_appointments
  FROM appointment_slots
  WHERE doctor_id = p_doctor_id
    AND slot_date = p_slot_date
    AND start_time = p_start_time
    AND is_available = true
  FOR UPDATE;

  -- Check if slot exists and is available
  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'Slot not found or unavailable';
  END IF;

  -- Check if slot is full
  IF COALESCE(v_current_bookings, 0) >= COALESCE(v_max_appointments, 1) THEN
    RAISE EXCEPTION 'Slot is fully booked';
  END IF;

  -- Increment booking count
  UPDATE appointment_slots
  SET current_bookings = COALESCE(current_bookings, 0) + 1,
      updated_at = now()
  WHERE id = v_slot_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_slot_booking(
  p_doctor_id uuid,
  p_slot_date date,
  p_start_time time
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointment_slots
  SET current_bookings = GREATEST(COALESCE(current_bookings, 0) - 1, 0),
      updated_at = now()
  WHERE doctor_id = p_doctor_id
    AND slot_date = p_slot_date
    AND start_time = p_start_time;

  RETURN true;
END;
$$;

-- Create triggers for automatic slot updates
CREATE OR REPLACE FUNCTION public.handle_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment slot booking count
  PERFORM increment_slot_booking(
    NEW.doctor_id,
    NEW.appointment_date,
    NEW.appointment_time
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to book slot: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_appointment_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement slot booking count
  PERFORM decrement_slot_booking(
    OLD.doctor_id,
    OLD.appointment_date,
    OLD.appointment_time
  );
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_appointment_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status changed to cancelled, decrement slot
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM decrement_slot_booking(
      OLD.doctor_id,
      OLD.appointment_date,
      OLD.appointment_time
    );
  END IF;
  
  -- If status changed from cancelled to active, increment slot
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    PERFORM increment_slot_booking(
      NEW.doctor_id,
      NEW.appointment_date,
      NEW.appointment_time
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_appointment_insert ON appointments;
DROP TRIGGER IF EXISTS trg_appointment_delete ON appointments;
DROP TRIGGER IF EXISTS trg_appointment_status_update ON appointments;

-- Create triggers
CREATE TRIGGER trg_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_insert();

CREATE TRIGGER trg_appointment_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_appointment_delete();

CREATE TRIGGER trg_appointment_status_update
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_appointment_status_update();

-- Create index for faster slot queries
CREATE INDEX IF NOT EXISTS idx_appointment_slots_lookup 
  ON appointment_slots(doctor_id, slot_date, start_time);

-- Enable realtime for appointment_slots table
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;