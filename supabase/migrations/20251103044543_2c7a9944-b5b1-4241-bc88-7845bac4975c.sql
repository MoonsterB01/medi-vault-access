-- Allow users with family access to update patient information
CREATE POLICY "Users can update accessible patients"
ON patients
FOR UPDATE
USING (
  user_has_patient_access(auth.uid(), id) OR created_by = auth.uid()
)
WITH CHECK (
  user_has_patient_access(auth.uid(), id) OR created_by = auth.uid()
);

-- Table to store MediBot conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of conversation history
CREATE INDEX idx_chat_messages_patient_created 
  ON chat_messages(patient_id, created_at DESC);

-- RLS Policies for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own chat history
CREATE POLICY "Users can view their chat messages"
ON chat_messages
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM family_access fa
    WHERE fa.patient_id = chat_messages.patient_id
      AND fa.user_id = auth.uid()
      AND fa.can_view = true
  )
);

-- Users can insert their own messages
CREATE POLICY "Users can insert their messages"
ON chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM family_access fa
    WHERE fa.patient_id = chat_messages.patient_id
      AND fa.user_id = auth.uid()
      AND fa.can_view = true
  )
);