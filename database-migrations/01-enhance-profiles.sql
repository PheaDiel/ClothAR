-- Migration 01: Enhance Profiles Table with Security Fields
-- Run this in your Supabase SQL Editor

-- Add security-related columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.phone_verified IS 'Whether the phone number has been verified via OTP';
COMMENT ON COLUMN public.profiles.email_verified IS 'Whether the email has been verified';
COMMENT ON COLUMN public.profiles.account_locked_until IS 'Timestamp until which the account is locked due to failed login attempts';
COMMENT ON COLUMN public.profiles.failed_login_attempts IS 'Number of consecutive failed login attempts';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_account_locked ON public.profiles(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- Update existing users to have email_verified based on Supabase auth
UPDATE public.profiles p
SET email_verified = TRUE,
    email_verified_at = NOW()
FROM auth.users u
WHERE p.id = u.id 
  AND u.email_confirmed_at IS NOT NULL
  AND p.email_verified = FALSE;

COMMENT ON TABLE public.profiles IS 'User profiles with enhanced security fields';