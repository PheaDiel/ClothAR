-- Migration 17: Fix Cart Items Measurement Foreign Key
-- Run this in your Supabase SQL Editor after 16-notifications-table.sql

-- ============================================
-- Fix Missing Foreign Key Constraint
-- ============================================

-- Add the missing foreign key constraint for cart_items.measurement_id
-- This references the user_measurements table

ALTER TABLE public.cart_items
ADD CONSTRAINT cart_items_measurement_id_fkey
FOREIGN KEY (measurement_id) REFERENCES public.user_measurements(id) ON DELETE SET NULL;

-- ============================================
-- Verify the Fix
-- ============================================

-- You can verify this worked by running:
-- SELECT conname, conrelid::regclass, confrelid::regclass, conkey, confkey
-- FROM pg_constraint
-- WHERE conname = 'cart_items_measurement_id_fkey';

COMMENT ON CONSTRAINT cart_items_measurement_id_fkey ON public.cart_items IS 'Foreign key constraint linking cart items to user measurements';