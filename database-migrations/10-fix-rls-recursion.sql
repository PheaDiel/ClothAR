-- Migration 10: Fix RLS Infinite Recursion Issue
-- Run this in your Supabase SQL Editor after 09-admin-functionality.sql

-- ============================================
-- Fix Infinite Recursion in Profiles RLS Policies
-- ============================================

-- The issue: Admin policies reference the profiles table itself, causing infinite recursion
-- when checking if a user is an admin. We need to break this circular dependency.

-- Drop the problematic admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create a new admin policy that doesn't cause recursion
-- This policy allows admins to bypass RLS for all operations
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL USING (
    -- Allow if user is authenticated and has admin flag
    -- We need to be careful not to create recursion here
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
      -- Add a safety check to prevent infinite recursion
      AND p.id != public.profiles.id
    )
  );

-- Alternative approach: Create a security definer function to check admin status
-- This avoids the recursion by not referencing the profiles table in the policy

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN := FALSE;
BEGIN
  -- Direct query to avoid RLS recursion
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;

  RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update admin policies to use the function instead of direct table reference
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL USING (public.is_admin() = TRUE);

-- Apply the same fix to other admin policies
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all product variants" ON public.product_variants;
CREATE POLICY "Admins can manage all product variants" ON public.product_variants
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all fabric types" ON public.fabric_types;
CREATE POLICY "Admins can manage all fabric types" ON public.fabric_types
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all tailor profiles" ON public.tailor_profiles;
CREATE POLICY "Admins can manage all tailor profiles" ON public.tailor_profiles
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all shop profiles" ON public.shop_profiles;
CREATE POLICY "Admins can manage all shop profiles" ON public.shop_profiles
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all user measurements" ON public.user_measurements;
CREATE POLICY "Admins can manage all user measurements" ON public.user_measurements
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all carts" ON public.carts;
CREATE POLICY "Admins can manage all carts" ON public.carts
  FOR ALL USING (public.is_admin() = TRUE);

DROP POLICY IF EXISTS "Admins can manage all cart items" ON public.cart_items;
CREATE POLICY "Admins can manage all cart items" ON public.cart_items
  FOR ALL USING (public.is_admin() = TRUE);

-- ============================================
-- Test the Fix
-- ============================================

-- You can test this by:
-- 1. Creating a user and making them admin:
--    SELECT public.make_user_admin('user-uuid-here');

-- 2. Then try to query profiles as that user - it should work without recursion errors

-- 3. Try registering a new user - the trigger should work without recursion errors

COMMENT ON FUNCTION public.is_admin IS 'Checks admin status without causing RLS recursion';