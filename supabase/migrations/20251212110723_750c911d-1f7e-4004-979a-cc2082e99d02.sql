-- Fix security issues identified in the scan

-- 1. Add RLS policies for chat_messages table
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat messages"
ON public.chat_messages FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat messages"
ON public.chat_messages FOR DELETE
USING (user_id = auth.uid());

-- 2. Restrict doctors table to authenticated users only
DROP POLICY IF EXISTS "Public can view basic doctor info only" ON public.doctors;

CREATE POLICY "Authenticated users can view doctors"
ON public.doctors FOR SELECT TO authenticated
USING (true);

-- 3. Restrict appointment_slots to authenticated users only
DROP POLICY IF EXISTS "Anyone can view available appointment slots" ON public.appointment_slots;

CREATE POLICY "Authenticated users can view available slots"
ON public.appointment_slots FOR SELECT TO authenticated
USING (is_available = true);

-- 4. Add RLS policies for document_keywords table
CREATE POLICY "Users can view keywords for their documents"
ON public.document_keywords FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE d.id = document_keywords.document_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can insert keywords for their documents"
ON public.document_keywords FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE d.id = document_keywords.document_id
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Hospital staff can view document keywords"
ON public.document_keywords FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    JOIN public.users u ON u.id = auth.uid()
    WHERE d.id = document_keywords.document_id
    AND u.role = 'hospital_staff'::user_role
    AND p.hospital_id = u.hospital_id
  )
);