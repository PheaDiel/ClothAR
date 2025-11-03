-- Migration 13: Fix Audit Logs RLS Policies
-- Run this after 12-payment-verification-schema.sql

-- ============================================
-- Fix Audit Logs RLS Policies
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;

-- Create new policies that allow admins to view all logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'shop_owner')
    )
  );

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'shop_owner')
    )
  );

-- ============================================
-- Fix Login Attempts RLS Policies
-- ============================================

-- Allow service role to insert login attempts
CREATE POLICY "Service role can insert login attempts" ON public.login_attempts
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Update Functions to Use Service Role
-- ============================================

-- Update log_audit_event function to work with RLS
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert with service role permissions (bypasses RLS)
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_ip_address,
    p_user_agent,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON POLICY "Service role can insert audit logs" ON public.audit_logs IS 'Allows service role to insert audit logs for security functions';
COMMENT ON POLICY "Admins can insert audit logs" ON public.audit_logs IS 'Allows admin users to insert audit logs';
COMMENT ON POLICY "Service role can insert login attempts" ON public.login_attempts IS 'Allows service role to insert login attempts for rate limiting';