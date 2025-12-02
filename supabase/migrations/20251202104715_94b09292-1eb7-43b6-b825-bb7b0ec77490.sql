-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  diagnosis TEXT,
  chief_complaint TEXT,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  advice TEXT,
  follow_up_date DATE,
  vitals JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Trigger for prescription_id
CREATE OR REPLACE FUNCTION public.generate_prescription_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'RX-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_prescription_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.prescription_id IS NULL OR NEW.prescription_id = '' THEN
    NEW.prescription_id = generate_prescription_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_prescription_id_trigger
BEFORE INSERT ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_prescription_id();

-- RLS Policies for prescriptions
CREATE POLICY "Doctors can manage their prescriptions"
ON public.prescriptions FOR ALL
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

CREATE POLICY "Hospital staff can view prescriptions for their patients"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u, public.patients p
    WHERE u.id = auth.uid()
    AND u.role = 'hospital_staff'::user_role
    AND p.id = prescriptions.patient_id
    AND p.hospital_id = u.hospital_id
  )
);

-- Allow doctors to view documents for patients they have appointments with
CREATE POLICY "Doctors can view documents for appointment patients"
ON public.documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = documents.patient_id
    AND d.user_id = auth.uid()
  )
);

-- Allow doctors to view patient summaries for their appointment patients
CREATE POLICY "Doctors can view summaries for appointment patients"
ON public.patient_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = patient_summaries.patient_id
    AND d.user_id = auth.uid()
  )
);