-- Create health_insights table to store calculated metrics and AI insights
CREATE TABLE public.health_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.wellbeing_profiles(id) ON DELETE SET NULL,
  
  -- Calculated Metrics
  bmi NUMERIC,
  bmi_category TEXT,
  ideal_body_weight NUMERIC,
  body_fat_estimate NUMERIC,
  bmr NUMERIC,
  daily_calorie_requirement NUMERIC,
  fitness_score INTEGER,
  score_breakdown JSONB,
  
  -- AI Generated Content
  ai_insights JSONB,
  ai_model_used TEXT,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_health_insights_patient_id ON public.health_insights(patient_id);
CREATE INDEX idx_health_insights_current ON public.health_insights(patient_id, is_current) WHERE is_current = true;

-- RLS Policies: Users can only access their own insights
CREATE POLICY "Users can view their own health insights"
  ON public.health_insights
  FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can insert their own health insights"
  ON public.health_insights
  FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can update their own health insights"
  ON public.health_insights
  FOR UPDATE
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can delete their own health insights"
  ON public.health_insights
  FOR DELETE
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid())
  );