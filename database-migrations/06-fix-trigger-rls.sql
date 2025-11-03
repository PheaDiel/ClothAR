-- Migration 06: Fix Trigger RLS Issues
-- Run this in your Supabase SQL Editor after 04-enhanced-profiles.sql

-- ============================================
-- Fix RLS Policies for Profile Creation Trigger
-- ============================================

-- The issue: When users sign up, the trigger tries to create a profile,
-- but RLS policies prevent it because auth.uid() is not set in trigger context.
-- We need to allow the trigger function to bypass RLS for profile creation.

-- Drop the existing restrictive policy for INSERT
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create a new policy that allows profile creation during signup
-- This allows inserts where the ID matches the authenticated user OR during trigger execution
CREATE POLICY "Users can insert their own profile or trigger can create" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR
    -- Allow inserts when no authenticated user (during trigger execution)
    auth.uid() IS NULL OR
    -- Allow service role inserts (for admin operations)
    auth.role() = 'service_role'
  );

-- Alternative approach: Temporarily disable RLS for the trigger function
-- Create a service role policy that allows the trigger to work

-- ============================================
-- Test the Trigger
-- ============================================

-- You can test this by running in SQL Editor:
-- SELECT public.handle_new_user();

-- Or check if the trigger exists:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if the function exists:
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- ============================================
-- Verify Profile Creation
-- ============================================

-- After applying this migration, try creating a user account again.
-- The profile should be created automatically by the trigger.