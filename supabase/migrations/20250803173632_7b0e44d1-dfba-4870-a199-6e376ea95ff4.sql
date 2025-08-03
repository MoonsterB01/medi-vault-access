-- Create enums for user roles and record types
CREATE TYPE public.user_role AS ENUM ('hospital_staff', 'patient', 'family_member', 'admin');
CREATE TYPE public.record_type AS ENUM ('prescription', 'test_report', 'scan', 'discharge_summary', 'consultation_notes', 'lab_results', 'imaging');
CREATE TYPE public.severity_level AS ENUM ('low', 'moderate', 'high', 'critical');

-- Create Hospitals table
CREATE TABLE public.hospitals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    hospital_id UUID REFERENCES public.hospitals(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Patients table
CREATE TABLE public.patients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL,
    primary_contact TEXT NOT NULL,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Medical_Records table
CREATE TABLE public.medical_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    record_type record_type NOT NULL,
    description TEXT,
    severity severity_level NOT NULL DEFAULT 'low',
    record_date DATE NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Family_Access table
CREATE TABLE public.family_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT true,
    granted_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(patient_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_access ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create helper function to get user hospital
CREATE OR REPLACE FUNCTION public.get_user_hospital(user_id UUID)
RETURNS UUID AS $$
    SELECT hospital_id FROM public.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for hospitals
CREATE POLICY "Admins can view all hospitals" ON public.hospitals
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Hospital staff can view their hospital" ON public.hospitals
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND 
        id = public.get_user_hospital(auth.uid())
    );

CREATE POLICY "Admins can manage hospitals" ON public.hospitals
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Hospital staff can view users in their hospital" ON public.users
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        hospital_id = public.get_user_hospital(auth.uid())
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for patients
CREATE POLICY "Hospital staff can view patients in their hospital" ON public.patients
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        hospital_id = public.get_user_hospital(auth.uid())
    );

CREATE POLICY "Patients can view themselves if they have user account" ON public.patients
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'patient' AND
        EXISTS (SELECT 1 FROM public.family_access WHERE patient_id = id AND user_id = auth.uid())
    );

CREATE POLICY "Family members can view patients they have access to" ON public.patients
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'family_member' AND
        EXISTS (SELECT 1 FROM public.family_access WHERE patient_id = id AND user_id = auth.uid() AND can_view = true)
    );

CREATE POLICY "Hospital staff can manage patients in their hospital" ON public.patients
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        hospital_id = public.get_user_hospital(auth.uid())
    );

CREATE POLICY "Admins can manage all patients" ON public.patients
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for medical_records
CREATE POLICY "Hospital staff can view records for patients in their hospital" ON public.medical_records
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        EXISTS (
            SELECT 1 FROM public.patients p 
            WHERE p.id = patient_id AND p.hospital_id = public.get_user_hospital(auth.uid())
        )
    );

CREATE POLICY "Family members can view records they have access to" ON public.medical_records
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('family_member', 'patient') AND
        EXISTS (
            SELECT 1 FROM public.family_access fa 
            WHERE fa.patient_id = medical_records.patient_id 
            AND fa.user_id = auth.uid() 
            AND fa.can_view = true
        )
    );

CREATE POLICY "Hospital staff can manage records for their hospital patients" ON public.medical_records
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        EXISTS (
            SELECT 1 FROM public.patients p 
            WHERE p.id = patient_id AND p.hospital_id = public.get_user_hospital(auth.uid())
        )
    );

CREATE POLICY "Admins can manage all medical records" ON public.medical_records
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for family_access
CREATE POLICY "Users can view their own family access" ON public.family_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Hospital staff can view family access for their patients" ON public.family_access
    FOR SELECT USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        EXISTS (
            SELECT 1 FROM public.patients p 
            WHERE p.id = patient_id AND p.hospital_id = public.get_user_hospital(auth.uid())
        )
    );

CREATE POLICY "Hospital staff can manage family access for their patients" ON public.family_access
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        EXISTS (
            SELECT 1 FROM public.patients p 
            WHERE p.id = patient_id AND p.hospital_id = public.get_user_hospital(auth.uid())
        )
    );

CREATE POLICY "Admins can manage all family access" ON public.family_access
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) VALUES ('medical_records', 'medical_records', false);

-- Storage policies for medical records
CREATE POLICY "Hospital staff can upload to their hospital folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'medical_records' AND
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        (storage.foldername(name))[1] = public.get_user_hospital(auth.uid())::text
    );

CREATE POLICY "Hospital staff can view files in their hospital folder" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical_records' AND
        public.get_user_role(auth.uid()) = 'hospital_staff' AND
        (storage.foldername(name))[1] = public.get_user_hospital(auth.uid())::text
    );

CREATE POLICY "Family members can view files they have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical_records' AND
        public.get_user_role(auth.uid()) IN ('family_member', 'patient') AND
        EXISTS (
            SELECT 1 FROM public.family_access fa
            JOIN public.patients p ON p.id = fa.patient_id
            WHERE fa.user_id = auth.uid() 
            AND fa.can_view = true
            AND (storage.foldername(name))[2] = p.id::text
        )
    );

CREATE POLICY "Admins can manage all files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'medical_records' AND
        public.get_user_role(auth.uid()) = 'admin'
    );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();