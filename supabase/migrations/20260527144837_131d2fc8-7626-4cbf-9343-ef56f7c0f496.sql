
CREATE TABLE public.status_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'minor',
  status TEXT NOT NULL DEFAULT 'investigating',
  affected_components TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.status_incidents TO anon;
GRANT SELECT ON public.status_incidents TO authenticated;
GRANT ALL ON public.status_incidents TO service_role;

ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status incidents are publicly readable"
ON public.status_incidents
FOR SELECT
USING (true);

CREATE INDEX idx_status_incidents_started_at ON public.status_incidents(started_at DESC);

CREATE TRIGGER update_status_incidents_updated_at
BEFORE UPDATE ON public.status_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
