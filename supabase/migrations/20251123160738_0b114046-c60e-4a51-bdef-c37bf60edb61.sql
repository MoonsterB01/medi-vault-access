-- Create pharmacy_suppliers table
CREATE TABLE IF NOT EXISTS public.pharmacy_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pharmacy_purchases table
CREATE TABLE IF NOT EXISTS public.pharmacy_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.pharmacy_suppliers(id) ON DELETE RESTRICT,
  purchase_number TEXT NOT NULL UNIQUE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  bill_status TEXT NOT NULL DEFAULT 'pending' CHECK (bill_status IN ('pending', 'completed', 'cancelled')),
  refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  paid_amount NUMERIC DEFAULT 0,
  payment_mode TEXT,
  notes TEXT,
  invoice_file_url TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pharmacy_suppliers_hospital ON public.pharmacy_suppliers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_purchases_hospital ON public.pharmacy_purchases(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_purchases_supplier ON public.pharmacy_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_purchases_number ON public.pharmacy_purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_pharmacy_purchases_date ON public.pharmacy_purchases(purchase_date);

-- Enable RLS
ALTER TABLE public.pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pharmacy_suppliers
CREATE POLICY "Hospital staff can manage suppliers"
ON public.pharmacy_suppliers
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for pharmacy_purchases
CREATE POLICY "Hospital staff can manage purchases"
ON public.pharmacy_purchases
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins 
    WHERE user_id = auth.uid()
  )
);

-- Update triggers
CREATE TRIGGER update_pharmacy_suppliers_updated_at
  BEFORE UPDATE ON public.pharmacy_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_purchases_updated_at
  BEFORE UPDATE ON public.pharmacy_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate purchase number
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'PUR-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$;

-- Trigger to auto-generate purchase number
CREATE OR REPLACE FUNCTION set_purchase_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.purchase_number IS NULL OR NEW.purchase_number = '' THEN
    NEW.purchase_number = generate_purchase_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_purchase_number_trigger
  BEFORE INSERT ON public.pharmacy_purchases
  FOR EACH ROW
  EXECUTE FUNCTION set_purchase_number();