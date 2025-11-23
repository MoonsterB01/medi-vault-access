-- Create pharmacy_refunds table
CREATE TABLE IF NOT EXISTS public.pharmacy_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  billing_id UUID NOT NULL REFERENCES public.billing(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  refund_reason TEXT,
  refund_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  refunded_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_hospital ON public.pharmacy_refunds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_patient ON public.pharmacy_refunds(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_billing ON public.pharmacy_refunds(billing_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_refunds_status ON public.pharmacy_refunds(status);

-- Enable RLS
ALTER TABLE public.pharmacy_refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Hospital staff can manage refunds for their hospital
CREATE POLICY "Hospital staff can manage pharmacy refunds"
ON public.pharmacy_refunds
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_admins 
    WHERE user_id = auth.uid()
  )
);

-- Update trigger for updated_at
CREATE TRIGGER update_pharmacy_refunds_updated_at
  BEFORE UPDATE ON public.pharmacy_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();