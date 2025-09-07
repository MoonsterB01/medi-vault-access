-- Add comprehensive medical keywords for better document analysis (skip duplicates)
INSERT INTO public.medical_keywords (keyword, category, weight) VALUES
-- Lab Tests and Values
('hgb', 'lab_tests', 3.0),
('wbc', 'lab_tests', 3.0),
('white blood cell', 'lab_tests', 3.0),
('rbc', 'lab_tests', 3.0),
('red blood cell', 'lab_tests', 3.0),
('platelet', 'lab_tests', 3.0),
('glucose', 'lab_tests', 3.0),
('hba1c', 'lab_tests', 3.0),
('cholesterol', 'lab_tests', 2.5),
('triglycerides', 'lab_tests', 2.5),
('creatinine', 'lab_tests', 2.5),
('bilirubin', 'lab_tests', 2.5),
('ast', 'lab_tests', 2.5),
('alt', 'lab_tests', 2.5),
('alkaline phosphatase', 'lab_tests', 2.5),

-- Medical Units
('mg/dl', 'medical_units', 2.5),
('mg/l', 'medical_units', 2.5),
('g/dl', 'medical_units', 2.5),
('cells/μl', 'medical_units', 3.0),
('cells/ul', 'medical_units', 3.0),
('bpm', 'medical_units', 2.0),
('meq/l', 'medical_units', 2.5),
('iu/l', 'medical_units', 2.5),
('ng/ml', 'medical_units', 2.5),
('pg/ml', 'medical_units', 2.5),
('μg/ml', 'medical_units', 2.5),
('ug/ml', 'medical_units', 2.5),

-- Document Categories  
('pathology', 'document_types', 3.0),
('radiology', 'document_types', 3.0),
('discharge summary', 'document_types', 3.0),
('lab report', 'document_types', 3.0),
('blood work', 'document_types', 3.0),

-- Medical Ranges and Indicators
('normal range', 'medical_indicators', 2.0),
('reference range', 'medical_indicators', 2.0),
('abnormal', 'medical_indicators', 2.0),
('elevated', 'medical_indicators', 2.0),
('decreased', 'medical_indicators', 2.0),
('within normal limits', 'medical_indicators', 2.0),
('wnl', 'medical_indicators', 2.0),

-- Additional Medical Terms
('differential', 'lab_tests', 2.5),
('cbc', 'lab_tests', 3.0),
('bmp', 'lab_tests', 2.5),
('cmp', 'lab_tests', 2.5),
('lipid panel', 'lab_tests', 2.5),
('thyroid function', 'lab_tests', 2.5),
('tsh', 'lab_tests', 2.5),
('t3', 'lab_tests', 2.5),
('t4', 'lab_tests', 2.5)
ON CONFLICT (keyword) DO NOTHING