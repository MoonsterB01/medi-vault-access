-- Add columns to lab_orders for workflow tracking
ALTER TABLE public.lab_orders 
ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON public.lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_order_date ON public.lab_orders(order_date);

-- Add unique constraint for order_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_orders_order_number ON public.lab_orders(order_number) WHERE order_number IS NOT NULL;