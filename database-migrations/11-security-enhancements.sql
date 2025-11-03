-- Migration 11: Security Enhancements
-- Run this in your Supabase SQL Editor after 10-fix-rls-recursion.sql

-- ============================================
-- Enhanced Security Fields for Profiles
-- ============================================

-- Add security-related fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Add verification token table for email verification
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for email verification tokens
CREATE POLICY "Users can view their own verification tokens" ON public.email_verification_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification tokens" ON public.email_verification_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification tokens" ON public.email_verification_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON public.email_verification_tokens(expires_at);

-- ============================================
-- Enhanced Audit Logging Functions
-- ============================================

-- Function to log audit events (with specific signature to avoid conflicts)
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

-- Drop the old function signature if it exists
DROP FUNCTION IF EXISTS public.log_audit_event(UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TEXT);

-- ============================================
-- Rate Limiting Functions
-- ============================================

-- Function to check login rate limit
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining_attempts INT,
  lockout_until TIMESTAMPTZ
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_failed_attempts INT;
  v_max_attempts INT := 5;
  v_window_minutes INT := 15;
  v_lockout_minutes INT := 30;
BEGIN
  -- Calculate window start
  v_window_start := NOW() - INTERVAL '1 minute' * v_window_minutes;

  -- Count failed attempts in window
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at >= v_window_start;

  -- Check if account should be locked
  IF v_failed_attempts >= v_max_attempts THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      v_window_start + INTERVAL '1 minute' * v_lockout_minutes;
  ELSE
    RETURN QUERY SELECT
      TRUE,
      v_max_attempts - v_failed_attempts,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Password Policy Functions
-- ============================================

-- Function to validate password strength
CREATE OR REPLACE FUNCTION public.validate_password_strength(p_password TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_min_length INT := 8;
  v_errors TEXT[];
BEGIN
  v_errors := ARRAY[]::TEXT[];

  -- Length check
  IF LENGTH(p_password) < v_min_length THEN
    v_errors := v_errors || format('Password must be at least %s characters long', v_min_length);
  END IF;

  -- Uppercase check
  IF NOT p_password ~ '[A-Z]' THEN
    v_errors := v_errors || 'Password must contain at least one uppercase letter';
  END IF;

  -- Lowercase check
  IF NOT p_password ~ '[a-z]' THEN
    v_errors := v_errors || 'Password must contain at least one lowercase letter';
  END IF;

  -- Number check
  IF NOT p_password ~ '[0-9]' THEN
    v_errors := v_errors || 'Password must contain at least one number';
  END IF;

  -- Common password check
  IF p_password ILIKE ANY(ARRAY['password', '123456', 'qwerty', 'admin', 'letmein']) THEN
    v_errors := v_errors || 'Password is too common';
  END IF;

  -- Return result
  IF array_length(v_errors, 1) > 0 THEN
    RETURN QUERY SELECT FALSE, array_to_string(v_errors, '; ');
  ELSE
    RETURN QUERY SELECT TRUE, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Enhanced User Registration Trigger
-- ============================================

-- Update the handle_new_user function to include security fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_verification_token TEXT;
BEGIN
  -- Generate verification token
  v_verification_token := encode(gen_random_bytes(32), 'hex');

  -- Insert profile with security fields
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    role,
    role_status,
    email_verified,
    phone_verified,
    password_changed_at,
    verification_status,
    full_name,
    date_of_birth,
    gender,
    marketing_email_consent
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'customer' THEN 'approved'
      ELSE 'pending'
    END,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    FALSE, -- phone_verified
    NOW(), -- password_changed_at
    CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'
      ELSE 'pending'
    END,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN NEW.raw_user_meta_data->>'date_of_birth' != '' THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'gender',
    COALESCE((NEW.raw_user_meta_data->>'marketing_email_consent')::BOOLEAN, FALSE)
  );

  -- Create email verification token if email not confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    INSERT INTO public.email_verification_tokens (
      user_id,
      email,
      token,
      expires_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_verification_token,
      NOW() + INTERVAL '24 hours'
    );
  END IF;

  -- Log registration
  PERFORM public.log_audit_event(
    NEW.id,
    'user_registered',
    'user',
    NEW.id::TEXT,
    jsonb_build_object(
      'email', NEW.email,
      'role', COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      'email_verified', NEW.email_confirmed_at IS NOT NULL
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Email Verification Functions
-- ============================================

-- Function to verify email with token
CREATE OR REPLACE FUNCTION public.verify_email_with_token(p_token TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID
) AS $$
DECLARE
  v_token_record RECORD;
  v_user_id UUID;
BEGIN
  -- Find valid token
  SELECT * INTO v_token_record
  FROM public.email_verification_tokens
  WHERE token = p_token
    AND expires_at > NOW()
    AND used = FALSE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired verification token', NULL::UUID;
    RETURN;
  END IF;

  -- Mark token as used
  UPDATE public.email_verification_tokens
  SET used = TRUE
  WHERE id = v_token_record.id;

  -- Update user profile
  UPDATE public.profiles
  SET
    email_verified = TRUE,
    email_verified_at = NOW(),
    verification_status = 'verified',
    updated_at = NOW()
  WHERE id = v_token_record.user_id;

  -- Log verification
  PERFORM public.log_audit_event(
    v_token_record.user_id,
    'email_verified',
    'user',
    v_token_record.user_id::TEXT,
    jsonb_build_object('email', v_token_record.email)
  );

  RETURN QUERY SELECT TRUE, 'Email verified successfully', v_token_record.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Login Tracking Functions
-- ============================================

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    last_login_at = NOW(),
    failed_login_attempts = 0, -- Reset failed attempts on successful login
    account_locked_until = NULL, -- Clear any lockout
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON public.profiles(last_login_at);
CREATE INDEX IF NOT EXISTS idx_profiles_failed_login_attempts ON public.profiles(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_profiles_account_locked_until ON public.profiles(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for user registration';
COMMENT ON FUNCTION public.log_audit_event IS 'Logs security and audit events to the audit_logs table';
COMMENT ON FUNCTION public.check_login_rate_limit IS 'Checks if login attempt should be rate limited';
COMMENT ON FUNCTION public.validate_password_strength IS 'Validates password against security policy';
COMMENT ON FUNCTION public.verify_email_with_token IS 'Verifies user email using verification token';
COMMENT ON FUNCTION public.update_last_login IS 'Updates user last login timestamp and resets security counters';