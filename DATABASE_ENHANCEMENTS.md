# Database Schema Enhancements

This document contains the enhanced database schema with security improvements for the ClothAR application.

---

## Enhanced Database Schema

### 1. Enhanced Profiles Table

Add security-related columns to the existing profiles table:

```sql
-- Add security columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone_verified IS 'Whether the phone number has been verified via OTP';
COMMENT ON COLUMN public.profiles.email_verified IS 'Whether the email has been verified';
COMMENT ON COLUMN public.profiles.account_locked_until IS 'Timestamp until which the account is locked due to failed login attempts';
```

---

## 2. OTP Verifications Table

Store and manage OTP codes for phone verification:

```sql
-- Create OTP verifications table
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

-- Create index for performance
CREATE INDEX idx_otp_verifications_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_verifications_phone ON public.otp_verifications(phone);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Add cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_verifications
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job to cleanup expired OTPs (run daily)
-- Note: This requires pg_cron extension
-- SELECT cron.schedule('cleanup-expired-otps', '0 2 * * *', 'SELECT public.cleanup_expired_otps()');
```

---

## 3. Audit Logs Table

Track all security-sensitive events:

```sql
-- Create audit logs table
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

-- Admins can view all logs (requires admin role implementation)
-- CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Add function to log events
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

-- Add cleanup function for old audit logs (keep 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Login Attempts Table

Track login attempts for rate limiting and security monitoring:

```sql
-- Create login attempts table
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

-- Create policy (only admins should see this)
-- Users can see their own attempts
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

-- Function to check if account should be locked
CREATE OR REPLACE FUNCTION public.check_login_attempts(p_email TEXT)
RETURNS TABLE(should_lock BOOLEAN, attempts_count INT) AS $$
DECLARE
  v_attempts INT;
  v_should_lock BOOLEAN;
BEGIN
  -- Count failed attempts in last 15 minutes
  SELECT COUNT(*) INTO v_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Lock if 5 or more failed attempts
  v_should_lock := v_attempts >= 5;
  
  RETURN QUERY SELECT v_should_lock, v_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login attempt
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
BEGIN
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
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old login attempts (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. User Sessions Table

Track active user sessions for security:

```sql
-- Create user sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity DESC);

-- Function to revoke session
CREATE OR REPLACE FUNCTION public.revoke_session(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'User initiated'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_sessions
  SET revoked = TRUE,
      revoked_at = NOW(),
      revoke_reason = p_reason
  WHERE id = p_session_id
    AND user_id = auth.uid()
    AND revoked = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW() OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Password Reset Tokens Table

Secure password reset functionality:

```sql
-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  ip_address INET
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR (used = TRUE AND used_at < NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Enhanced Profile Trigger

Update the profile creation trigger to include new fields:

```sql
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create enhanced function
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
    FALSE, -- phone_verified starts as false
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

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 8. Performance Indexes

Additional indexes for optimal query performance:

```sql
-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, role_status);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_account_locked ON public.profiles(account_locked_until) WHERE account_locked_until IS NOT NULL;
```

---

## 9. Admin Role Implementation

Create admin role and policies:

```sql
-- Add admin role to role enum (if using enum)
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Or update check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('customer', 'tailor', 'shop_owner', 'admin'));

-- Create admin policies for audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create admin policies for login attempts
CREATE POLICY "Admins can view all login attempts" ON public.login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create admin policies for user sessions
CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to approve/reject role requests
CREATE OR REPLACE FUNCTION public.update_role_status(
  p_user_id UUID,
  p_new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update role status';
  END IF;
  
  -- Update the role status
  UPDATE public.profiles
  SET role_status = p_new_status,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the action
  PERFORM public.log_audit_event(
    auth.uid(),
    'role_status_updated',
    'profile',
    p_user_id::TEXT,
    jsonb_build_object(
      'new_status', p_new_status
    )
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 10. Scheduled Maintenance Jobs

Set up automated cleanup jobs (requires pg_cron extension):

```sql
-- Enable pg_cron extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup jobs
-- Cleanup expired OTPs daily at 2 AM
-- SELECT cron.schedule('cleanup-expired-otps', '0 2 * * *', 'SELECT public.cleanup_expired_otps()');

-- Cleanup old audit logs daily at 3 AM
-- SELECT cron.schedule('cleanup-old-audit-logs', '0 3 * * *', 'SELECT public.cleanup_old_audit_logs()');

-- Cleanup old login attempts daily at 4 AM
-- SELECT cron.schedule('cleanup-old-login-attempts', '0 4 * * *', 'SELECT public.cleanup_old_login_attempts()');

-- Cleanup expired sessions every hour
-- SELECT cron.schedule('cleanup-expired-sessions', '0 * * * *', 'SELECT public.cleanup_expired_sessions()');

-- Cleanup expired reset tokens daily at 5 AM
-- SELECT cron.schedule('cleanup-expired-reset-tokens', '0 5 * * *', 'SELECT public.cleanup_expired_reset_tokens()');
```

---

## Migration Steps

To apply these enhancements to your existing database:

1. **Backup your database** before making any changes
2. Run the SQL scripts in order:
   - Enhanced profiles table alterations
   - Create new tables (OTP, audit logs, login attempts, sessions, reset tokens)
   - Update triggers and functions
   - Create indexes
   - Set up admin roles and policies
   - Schedule maintenance jobs (if using pg_cron)

3. **Test thoroughly** in a development environment first
4. Update your application code to use the new fields and tables
5. Deploy to production during a maintenance window

---

## Notes

- All tables have RLS enabled for security
- Indexes are created for optimal query performance
- Cleanup functions help maintain database size
- Audit logging provides security monitoring
- Rate limiting prevents brute force attacks
- Session management allows users to control their active sessions
