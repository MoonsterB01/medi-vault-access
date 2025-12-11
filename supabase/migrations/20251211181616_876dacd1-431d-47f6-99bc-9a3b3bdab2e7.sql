-- Create wellbeing_profiles table
CREATE TABLE public.wellbeing_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  age INTEGER,
  gender TEXT,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'moderate', 'active')),
  sleep_hours NUMERIC,
  daily_calorie_target INTEGER,
  resting_heart_rate INTEGER,
  dietary_preferences JSONB DEFAULT '{}',
  food_allergies TEXT[] DEFAULT '{}',
  cuisine_preferences TEXT[] DEFAULT '{}',
  health_goals TEXT[] DEFAULT '{}',
  meal_frequency INTEGER DEFAULT 3,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

-- Create diet_plans table
CREATE TABLE public.diet_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.wellbeing_profiles(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  plan_data JSONB NOT NULL,
  ai_model_used TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fitness_records table
CREATE TABLE public.fitness_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  steps INTEGER,
  workout_type TEXT,
  workout_duration_minutes INTEGER,
  calories_burned INTEGER,
  distance_km NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medicine_tracking table
CREATE TABLE public.medicine_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  scheduled_times TEXT[] DEFAULT '{}',
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('taken', 'missed', 'skipped', 'pending')) DEFAULT 'pending',
  taken_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create home_remedies table (reference data)
CREATE TABLE public.home_remedies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  ingredients JSONB DEFAULT '[]',
  instructions TEXT,
  precautions TEXT,
  tags TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.wellbeing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_remedies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wellbeing_profiles
CREATE POLICY "Users can view their own wellbeing profile"
ON public.wellbeing_profiles FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

CREATE POLICY "Users can create their own wellbeing profile"
ON public.wellbeing_profiles FOR INSERT
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

CREATE POLICY "Users can update their own wellbeing profile"
ON public.wellbeing_profiles FOR UPDATE
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

-- RLS Policies for diet_plans
CREATE POLICY "Users can view their own diet plans"
ON public.diet_plans FOR SELECT
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

CREATE POLICY "Users can create their own diet plans"
ON public.diet_plans FOR INSERT
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

CREATE POLICY "Users can update their own diet plans"
ON public.diet_plans FOR UPDATE
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

-- RLS Policies for fitness_records
CREATE POLICY "Users can manage their own fitness records"
ON public.fitness_records FOR ALL
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

-- RLS Policies for medicine_tracking
CREATE POLICY "Users can manage their own medicine tracking"
ON public.medicine_tracking FOR ALL
USING (patient_id IN (SELECT id FROM public.patients WHERE created_by = auth.uid()));

-- RLS Policies for home_remedies (public read, admin write)
CREATE POLICY "Anyone can view home remedies"
ON public.home_remedies FOR SELECT
USING (true);

CREATE POLICY "Admins can manage home remedies"
ON public.home_remedies FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create updated_at trigger for wellbeing_profiles
CREATE TRIGGER update_wellbeing_profiles_updated_at
BEFORE UPDATE ON public.wellbeing_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial home remedies data for India
INSERT INTO public.home_remedies (title, category, description, ingredients, instructions, precautions, tags, is_verified) VALUES
('Tulsi Tea for Cold', 'Cold & Cough', 'Traditional Indian remedy using holy basil leaves to relieve cold symptoms', '["Fresh tulsi leaves (10-15)", "Ginger (1 inch piece)", "Honey (1 tsp)", "Black pepper (2-3 crushed)", "Water (2 cups)"]', 'Boil tulsi leaves and ginger in water for 10 minutes. Strain, add honey and pepper. Drink warm 2-3 times daily.', 'Avoid if pregnant. Consult doctor if symptoms persist beyond 3 days.', '{"immunity", "cold", "cough", "tulsi", "ayurveda"}', true),
('Turmeric Milk (Haldi Doodh)', 'Immunity', 'Golden milk - a powerful anti-inflammatory and immunity booster', '["Milk (1 cup)", "Turmeric powder (1/2 tsp)", "Black pepper (pinch)", "Ghee (1/2 tsp)", "Honey or jaggery (to taste)"]', 'Warm milk with turmeric and pepper. Add ghee. Sweeten with honey after cooling slightly. Drink before bed.', 'Use organic turmeric. Not recommended for those with gallbladder issues.', '{"immunity", "sleep", "anti-inflammatory", "turmeric"}', true),
('Ginger-Lemon for Digestion', 'Digestion', 'Quick remedy for indigestion and bloating', '["Fresh ginger juice (1 tsp)", "Lemon juice (1 tsp)", "Black salt (pinch)", "Warm water (1/2 cup)"]', 'Mix all ingredients in warm water. Drink 15 minutes before meals or when experiencing discomfort.', 'Avoid on empty stomach if you have acidity issues.', '{"digestion", "bloating", "nausea", "ginger"}', true),
('Ajwain Water', 'Digestion', 'Carom seeds water for gas and stomach ache', '["Ajwain/Carom seeds (1 tsp)", "Water (1 cup)"]', 'Boil ajwain in water until reduced to half. Strain and drink warm. Can add rock salt.', 'Pregnant women should consult doctor before use.', '{"gas", "bloating", "stomach pain", "ajwain"}', true),
('Neem for Skin', 'Skin Care', 'Natural antibacterial treatment for acne and skin infections', '["Neem leaves (handful)", "Turmeric powder (1/4 tsp)", "Water"]', 'Make paste of neem leaves with turmeric. Apply on affected areas for 15-20 minutes. Rinse with cool water.', 'Do patch test first. Avoid contact with eyes.', '{"acne", "skin", "antibacterial", "neem"}', true),
('Amla for Hair', 'Hair Care', 'Indian gooseberry for hair growth and strength', '["Amla powder (2 tbsp)", "Coconut oil (4 tbsp)"]', 'Heat coconut oil with amla powder on low flame for 5 minutes. Cool and strain. Massage into scalp, leave overnight.', 'Wash thoroughly next morning. May temporarily darken light hair.', '{"hair growth", "hair fall", "amla", "scalp health"}', true),
('Jeera Water for Weight Loss', 'Weight Management', 'Cumin water to boost metabolism', '["Cumin seeds (1 tbsp)", "Water (1 liter)"]', 'Soak cumin seeds overnight in water. Boil in morning, strain and drink throughout the day.', 'Start with small amounts. May not be suitable for those on blood thinners.', '{"weight loss", "metabolism", "cumin", "detox"}', true),
('Coconut Oil Pulling', 'Oral Health', 'Ancient practice for oral hygiene and detox', '["Virgin coconut oil (1 tbsp)"]', 'Swish oil in mouth for 15-20 minutes on empty stomach. Spit out (not in sink). Rinse with warm water.', 'Do not swallow. Not a replacement for brushing.', '{"oral health", "teeth", "detox", "coconut oil"}', true);