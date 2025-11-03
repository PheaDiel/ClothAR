-- Migration 16: Notifications Table
-- Run this in your Supabase SQL Editor after previous migrations

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order_status', 'tailoring_update', 'general', 'promotion', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  order_id TEXT, -- For order-related notifications
  data JSONB, -- Additional data like order details, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Allow system/admin to create notifications

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Add comments
COMMENT ON TABLE public.notifications IS 'User notifications for orders, updates, and system messages';
COMMENT ON COLUMN public.notifications.user_id IS 'User who receives the notification';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: order_status, tailoring_update, general, promotion, system';
COMMENT ON COLUMN public.notifications.title IS 'Notification title';
COMMENT ON COLUMN public.notifications.message IS 'Notification message content';
COMMENT ON COLUMN public.notifications.read IS 'Whether the notification has been read';
COMMENT ON COLUMN public.notifications.order_id IS 'Associated order ID for order-related notifications';
COMMENT ON COLUMN public.notifications.data IS 'Additional JSON data for the notification';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_notification_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Create function to send notification (can be called from backend)
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_order_id TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, order_id, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_order_id, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_notification IS 'Function to send notifications to users';