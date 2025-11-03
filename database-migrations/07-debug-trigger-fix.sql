-- Migration 07: Debug and Fix Trigger Issues
-- Run this in your Supabase SQL Editor to debug trigger issues

-- ============================================
-- Step 1: Check Current State
-- ============================================

-- Check if trigger exists
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgfoid::regproc as function_name,
  tgtype,
  tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- Step 2: Clean Up and Recreate
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with minimal fields first
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile with minimal required fields
  INSERT INTO public.profiles (
    id,
    name,
    phone,
    role,
    role_status,
    email_verified,
    verification_status,
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
    CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'verified'
      ELSE 'pending'
    END,
    NOW()
  );

  -- Log the registration (optional - comment out if causing issues)
  -- PERFORM public.log_audit_event(
  --   NEW.id,
  --   'user_registered',
  --   'user',
  --   NEW.id::TEXT,
  --   jsonb_build_object(
  --     'email', NEW.email,
  --     'role', COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  --   )
  -- );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 3: Test the Trigger
-- ============================================

-- Test by creating a test user (run this manually):
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_user_meta_data
-- ) VALUES (
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"name": "Test User", "role": "customer"}'::jsonb
-- );

-- Check if profile was created:
-- SELECT * FROM profiles WHERE name = 'Test User';

-- Clean up test user:
-- DELETE FROM auth.users WHERE email = 'test@example.com';

-- ============================================
-- Step 4: Add Enhanced Fields Later
-- ============================================

-- After confirming basic trigger works, run this to add enhanced fields:
-- UPDATE profiles SET
--   full_name = raw_user_meta_data->>'full_name',
--   date_of_birth = CASE
--     WHEN raw_user_meta_data->>'date_of_birth' != ''
--     THEN (raw_user_meta_data->>'date_of_birth')::DATE
--     ELSE NULL
--   END,
--   gender = raw_user_meta_data->>'gender',
--   marketing_email_consent = COALESCE((raw_user_meta_data->>'marketing_email_consent')::BOOLEAN, FALSE)
-- FROM auth.users
-- WHERE profiles.id = auth.users.id;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates basic profile on user registration - enhanced fields added separately';