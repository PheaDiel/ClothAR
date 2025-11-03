-- Migration 09: Admin Functionality
-- Run this in your Supabase SQL Editor after 08-orders-inventory-schema.sql

-- Add admin field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin policies for full access to all tables
-- Note: These policies allow admins to bypass RLS for management purposes
-- In production, you should use service key or admin-specific authentication

-- Admin policy for profiles (full access)
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for products (full access)
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for product variants (full access)
CREATE POLICY "Admins can manage all product variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for fabric types (full access)
CREATE POLICY "Admins can manage all fabric types" ON public.fabric_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for orders (full access)
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for order items (full access)
CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for tailor profiles (full access)
CREATE POLICY "Admins can manage all tailor profiles" ON public.tailor_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for shop profiles (full access)
CREATE POLICY "Admins can manage all shop profiles" ON public.shop_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for user measurements (full access)
CREATE POLICY "Admins can manage all user measurements" ON public.user_measurements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for carts (full access)
CREATE POLICY "Admins can manage all carts" ON public.carts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Admin policy for cart items (full access)
CREATE POLICY "Admins can manage all cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to admin (call with service key)
CREATE OR REPLACE FUNCTION public.make_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles
  SET is_admin = TRUE, updated_at = NOW()
  WHERE id = user_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin (call with service key)
CREATE OR REPLACE FUNCTION public.remove_admin_status(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles
  SET is_admin = FALSE, updated_at = NOW()
  WHERE id = user_uuid;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.is_admin IS 'Indicates if user has admin privileges for full system access';
COMMENT ON FUNCTION public.is_user_admin IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION public.make_user_admin IS 'Promotes a user to admin status (requires service key)';
COMMENT ON FUNCTION public.remove_admin_status IS 'Removes admin status from a user (requires service key)';