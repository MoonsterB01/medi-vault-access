
ALTER TABLE public.diagnoses
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS evidence_text text,
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS confidence numeric;

INSERT INTO public.app_config (key, value)
VALUES ('diagnosis_confidence_threshold', '0.6'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.diagnoses d
SET hidden_by_user = true
FROM public.documents doc
WHERE d.classification IS NULL
  AND d.hidden_by_user = false
  AND (d.source_docs::text ILIKE '%' || doc.id::text || '%')
  AND doc.document_type IN ('clinic_letterhead', 'marketing', 'directory');
