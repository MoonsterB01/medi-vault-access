-- Phase 1: Enable realtime functionality for notifications table
-- Set replica identity to capture full row data for realtime updates
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Ensure RLS policy allows system notifications to be created
-- The current policy only allows users to manage their own notifications
-- We need a policy for system/edge function insertions
CREATE POLICY "System can create notifications for users"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create a unified notification creation function
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notification_title text,
  notification_message text,
  notification_type text,
  appointment_id_param uuid DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    appointment_id,
    metadata,
    is_read,
    created_at
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    appointment_id_param,
    metadata_param,
    false,
    now()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;