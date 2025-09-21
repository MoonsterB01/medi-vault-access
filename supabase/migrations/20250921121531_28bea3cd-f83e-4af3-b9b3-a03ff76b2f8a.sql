-- Phase 1: Extend database schema for MediDoc/MediLock appointment system

-- Add doctor role to existing user_role enum
ALTER TYPE user_role ADD VALUE 'doctor';

-- Create doctors table for doctor profiles
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL UNIQUE,
  specialization TEXT NOT NULL,
  qualifications TEXT[],
  years_experience INTEGER DEFAULT 0,
  consultation_fee DECIMAL(10,2),
  hospital_affiliations UUID[] DEFAULT '{}',
  bio TEXT,
  profile_image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  working_hours JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table for appointment management
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
  appointment_type TEXT DEFAULT 'consultation' CHECK (appointment_type IN ('consultation', 'follow_up', 'emergency', 'routine_checkup')),
  chief_complaint TEXT,
  notes TEXT,
  patient_notes TEXT,
  doctor_notes TEXT,
  booking_source TEXT DEFAULT 'patient_portal',
  created_by UUID NOT NULL REFERENCES public.users(id),
  confirmed_by UUID REFERENCES public.users(id),
  cancelled_by UUID REFERENCES public.users(id),
  cancellation_reason TEXT,
  rescheduled_from UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_patient_relationships table
CREATE TABLE public.doctor_patient_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'primary_care' CHECK (relationship_type IN ('primary_care', 'specialist', 'consultant', 'emergency')),
  first_visit_date DATE,
  last_visit_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id, relationship_type)
);

-- Create appointment_slots table for doctor availability
CREATE TABLE public.appointment_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  slot_type TEXT DEFAULT 'regular' CHECK (slot_type IN ('regular', 'emergency', 'blocked')),
  max_appointments INTEGER DEFAULT 1,
  current_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, slot_date, start_time)
);

-- Create notifications table for real-time updates
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('appointment_booked', 'appointment_confirmed', 'appointment_cancelled', 'appointment_rescheduled', 'appointment_reminder', 'doctor_message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate doctor ID
CREATE OR REPLACE FUNCTION public.generate_doctor_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'DOC-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to generate appointment ID
CREATE OR REPLACE FUNCTION public.generate_appointment_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'APT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to set doctor_id automatically
CREATE OR REPLACE FUNCTION public.set_doctor_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_id IS NULL THEN
    NEW.doctor_id = generate_doctor_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to set appointment_id automatically
CREATE OR REPLACE FUNCTION public.set_appointment_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_id IS NULL THEN
    NEW.appointment_id = generate_appointment_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for doctors table
CREATE TRIGGER set_doctor_id_trigger
BEFORE INSERT ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.set_doctor_id();

-- Create trigger for appointments table
CREATE TRIGGER set_appointment_id_trigger
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointment_id();

-- Create triggers for updated_at columns
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_patient_relationships_updated_at
BEFORE UPDATE ON public.doctor_patient_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_slots_updated_at
BEFORE UPDATE ON public.appointment_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patient_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctors table
CREATE POLICY "Doctors can view and update their own profile"
ON public.doctors
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Anyone can view doctor profiles"
ON public.doctors
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all doctors"
ON public.doctors
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- RLS Policies for appointments table
CREATE POLICY "Doctors can view their appointments"
ON public.appointments
FOR ALL
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view their appointments"
ON public.appointments
FOR SELECT
USING (patient_id IN (
  SELECT patient_id FROM public.family_access 
  WHERE user_id = auth.uid() AND can_view = true
));

CREATE POLICY "Patients can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT patient_id FROM public.family_access 
    WHERE user_id = auth.uid() AND can_view = true
  ) AND created_by = auth.uid()
);

CREATE POLICY "Hospital staff can view appointments for their patients"
ON public.appointments
FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM public.patients p
    JOIN public.users u ON u.id = auth.uid()
    WHERE p.hospital_id = u.hospital_id
    AND u.role = 'hospital_staff'::user_role
  )
);

CREATE POLICY "Admins can manage all appointments"
ON public.appointments
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- RLS Policies for doctor_patient_relationships
CREATE POLICY "Doctors can view their patient relationships"
ON public.doctor_patient_relationships
FOR ALL
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Patients can view their doctor relationships"
ON public.doctor_patient_relationships
FOR SELECT
USING (patient_id IN (
  SELECT patient_id FROM public.family_access 
  WHERE user_id = auth.uid() AND can_view = true
));

CREATE POLICY "Hospital staff can view relationships for their patients"
ON public.doctor_patient_relationships
FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM public.patients p
    JOIN public.users u ON u.id = auth.uid()
    WHERE p.hospital_id = u.hospital_id
    AND u.role = 'hospital_staff'::user_role
  )
);

-- RLS Policies for appointment_slots
CREATE POLICY "Doctors can manage their appointment slots"
ON public.appointment_slots
FOR ALL
USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view available appointment slots"
ON public.appointment_slots
FOR SELECT
USING (is_available = true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR ALL
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX idx_doctors_doctor_id ON public.doctors(doctor_id);
CREATE INDEX idx_doctors_specialization ON public.doctors(specialization);

CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_appointment_id ON public.appointments(appointment_id);

CREATE INDEX idx_doctor_patient_rel_doctor_id ON public.doctor_patient_relationships(doctor_id);
CREATE INDEX idx_doctor_patient_rel_patient_id ON public.doctor_patient_relationships(patient_id);

CREATE INDEX idx_appointment_slots_doctor_id ON public.appointment_slots(doctor_id);
CREATE INDEX idx_appointment_slots_date ON public.appointment_slots(slot_date);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_appointment_id ON public.notifications(appointment_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);