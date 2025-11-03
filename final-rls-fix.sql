-- Final RLS Fix for Profiles Table
-- Run this in your Supabase SQL Editor

-- ============================================
-- Re-enable RLS with working policies
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop any remaining policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- ============================================
-- Create working policies
-- ============================================

-- Allow users to view their own profile
CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation (for registration trigger)
CREATE POLICY "allow_profile_creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Test the policies
-- ============================================

-- These policies should work without recursion:
-- 1. SELECT: Only own profile
-- 2. UPDATE: Only own profile
-- 3. INSERT: Allow all (needed for trigger)

-- The key insight: No policies reference the profiles table itself
-- This prevents the infinite recursion that was occurring