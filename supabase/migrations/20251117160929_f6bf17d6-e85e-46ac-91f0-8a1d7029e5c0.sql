-- Prevent overlapping or duplicate appointment slots
-- 1) Unique index to prevent exact duplicates (same doctor/date/start)
CREATE UNIQUE INDEX IF NOT EXISTS uq_slots_doctor_date_start
ON public.appointment_slots(doctor_id, slot_date, start_time);

-- 2) Trigger function to block overlapping time ranges per doctor per day
CREATE OR REPLACE FUNCTION public.prevent_overlapping_slots()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overlap_count int;
BEGIN
  -- Compute overlap on same date and doctor
  SELECT COUNT(1) INTO overlap_count
  FROM public.appointment_slots s
  WHERE s.doctor_id = NEW.doctor_id
    AND s.slot_date = NEW.slot_date
    AND s.id IS DISTINCT FROM NEW.id
    AND (NEW.start_time < s.end_time AND NEW.end_time > s.start_time);

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Overlapping slot exists for this doctor and time range';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Attach trigger
DROP TRIGGER IF EXISTS trg_prevent_overlapping_slots ON public.appointment_slots;
CREATE TRIGGER trg_prevent_overlapping_slots
BEFORE INSERT OR UPDATE ON public.appointment_slots
FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_slots();