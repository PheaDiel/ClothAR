-- Migration 03: Database Functions and Triggers
-- Run this in your Supabase SQL Editor after 02-security-tables.sql

-- ============================================
-- Audit Logging Function
-- ============================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    success,
    error_message
  ) VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    p_success,
    p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_audit_event IS 'Logs security-sensitive events to audit_logs table';

-- ============================================
-- Check Login Attempts Function
-- ============================================
CREATE OR REPLACE FUNCTION public.check_login_attempts(p_email TEXT)
RETURNS TABLE(should_lock BOOLEAN, attempts_count INT, locked_until TIMESTAMPTZ) AS $$
DECLARE
  v_attempts INT;
  v_should_lock BOOLEAN;
  v_locked_until TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Get user_id from email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  -- Check if account is currently locked
  IF v_user_id IS NOT NULL THEN
    SELECT account_locked_until INTO v_locked_until
    FROM public.profiles
    WHERE id = v_user_id;
    
    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
      RETURN QUERY SELECT TRUE, 5, v_locked_until;
      RETURN;
    END IF;
  END IF;
  
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Lock if 5 or more failed attempts
  v_should_lock := v_attempts >= 5;
  
  IF v_should_lock AND v_user_id IS NOT NULL THEN
    v_locked_until := NOW() + INTERVAL '15 minutes';
    UPDATE public.profiles
    SET account_locked_until = v_locked_until,
        failed_login_attempts = v_attempts
    WHERE id = v_user_id;
  END IF;
  
  RETURN QUERY SELECT v_should_lock, v_attempts, v_locked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_login_attempts IS 'Checks if account should be locked based on failed login attempts';

-- ============================================
-- Record Login Attempt Function
-- ============================================
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
  v_user_id UUID;
BEGIN
  -- Get user_id from email
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  -- Insert login attempt
  INSERT INTO public.login_attempts (
    email,
    ip_address,
    user_agent,
    success,
    failure_reason
  ) VALUES (
    p_email,
    p_ip_address,
    p_user_agent,
    p_success,
    p_failure_reason
  ) RETURNING id INTO v_attempt_id;
  
  -- Update profile on successful login
  IF p_success AND v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET last_login_at = NOW(),
        failed_login_attempts = 0,
        account_locked_until = NULL
    WHERE id = v_user_id;
  END IF;
  
  -- Log audit event
  IF v_user_id IS NOT NULL THEN
    PERFORM public.log_audit_event(
      v_user_id,
      CASE WHEN p_success THEN 'login_success' ELSE 'login_failed' END,
      'authentication',
      v_user_id::TEXT,
      jsonb_build_object(
        'email', p_email,
        'ip_address', p_ip_address::TEXT,
        'failure_reason', p_failure_reason
      ),
      p_success,
      p_failure_reason
    );
  END IF;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_login_attempt IS 'Records login attempt and updates user profile';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$

BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    role,
    role_status,
    email_verified,
    phone_verified,
    password_changed_at
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
    FALSE,
    NOW()
  );
  
  -- Log the registration
  PERFORM public.log_audit_event(
    NEW.id,
    'user_registered',
    'user',
    NEW.id::TEXT,
    jsonb_build_object(
      'email', NEW.email,
      'role', COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and logs audit event when new user registers';



-- ============================================
-- Cleanup Functions
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_verifications
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_otps IS 'Removes OTP records older than 24 hours';
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Removes audit logs older than 90 days';
COMMENT ON FUNCTION public.cleanup_old_login_attempts IS 'Removes login attempts older than 30 days';