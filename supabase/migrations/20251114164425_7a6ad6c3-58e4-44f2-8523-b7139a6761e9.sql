-- Extend hospitals table with registration fields
ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS registration_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS admin_username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS established_year INTEGER,
ADD COLUMN IF NOT EXISTS bed_count INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Create hospital_admins table to link users to hospitals as admins
CREATE TABLE IF NOT EXISTS public.hospital_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  is_primary_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, hospital_id)
);

-- Enable RLS on hospital_admins
ALTER TABLE public.hospital_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospital_admins
CREATE POLICY "Admins can view their hospital admin records"
ON public.hospital_admins
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create hospital admin records"
ON public.hospital_admins
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create IPD admissions table
CREATE TABLE IF NOT EXISTS public.ipd_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  ward_number TEXT,
  bed_number TEXT,
  admission_type TEXT,
  chief_complaint TEXT,
  assigned_doctor_id UUID REFERENCES public.doctors(id),
  status TEXT DEFAULT 'admitted',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ipd_admissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage IPD for their hospital"
ON public.ipd_admissions
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create OPD visits table
CREATE TABLE IF NOT EXISTS public.opd_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  doctor_id UUID REFERENCES public.doctors(id),
  chief_complaint TEXT,
  diagnosis TEXT,
  prescription TEXT,
  follow_up_date DATE,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.opd_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage OPD for their hospital"
ON public.opd_visits
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create billing table
CREATE TABLE IF NOT EXISTS public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  bill_number TEXT UNIQUE NOT NULL,
  bill_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  invoice_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage billing for their hospital"
ON public.billing
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create pharmacy inventory table
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  manufacturer TEXT,
  batch_number TEXT,
  expiry_date DATE,
  quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2),
  reorder_level INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage pharmacy inventory"
ON public.pharmacy_inventory
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create pharmacy dispensations table
CREATE TABLE IF NOT EXISTS public.pharmacy_dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  prescribed_by UUID REFERENCES public.doctors(id),
  dispensed_date TIMESTAMPTZ DEFAULT now(),
  medicines JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pharmacy_dispensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage pharmacy dispensations"
ON public.pharmacy_dispensations
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create lab tests table
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_code TEXT UNIQUE,
  department TEXT,
  sample_type TEXT,
  normal_range TEXT,
  unit TEXT,
  price DECIMAL(10,2),
  turnaround_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage lab tests"
ON public.lab_tests
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create lab orders table
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id),
  order_date TIMESTAMPTZ DEFAULT now(),
  tests JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  results JSONB,
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can manage lab orders"
ON public.lab_orders
FOR ALL
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all new tables
CREATE TRIGGER update_hospital_admins_updated_at BEFORE UPDATE ON public.hospital_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ipd_admissions_updated_at BEFORE UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opd_visits_updated_at BEFORE UPDATE ON public.opd_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_inventory_updated_at BEFORE UPDATE ON public.pharmacy_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_tests_updated_at BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lab_orders_updated_at BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();