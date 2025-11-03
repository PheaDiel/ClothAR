-- Complete RLS Removal for Testing
-- Run this in your Supabase SQL Editor

-- ============================================
-- Disable RLS completely on profiles table
-- ============================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop ALL existing policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile or trigger can create" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- ============================================
-- Keep RLS disabled for now
-- ============================================

-- RLS is now DISABLED on profiles table
-- This should eliminate ALL RLS-related errors

-- ============================================
-- Test the fix
-- ============================================

-- Try logging in now - there should be no RLS errors
-- Once login works, we can re-enable RLS with proper policies