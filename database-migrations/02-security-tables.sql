-- Migration 02: Create Security Tables
-- Run this in your Supabase SQL Editor after 01-enhance-profiles.sql

-- ============================================
-- OTP Verifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own OTP records" ON public.otp_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OTP records" ON public.otp_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTP records" ON public.otp_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_otp_verifications_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_verifications_phone ON public.otp_verifications(phone);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

COMMENT ON TABLE public.otp_verifications IS 'Stores OTP codes for phone verification';

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

COMMENT ON TABLE public.audit_logs IS 'Tracks all security-sensitive events';

-- ============================================
-- Login Attempts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own login attempts" ON public.login_attempts
  FOR SELECT USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address, attempted_at DESC);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at DESC);

COMMENT ON TABLE public.login_attempts IS 'Tracks login attempts for rate limiting and security monitoring';