-- Migration 12: Payment Verification Schema
-- Run this after 11-security-enhancements.sql

-- ============================================
-- Payment Verification Enhancements
-- ============================================

-- Add payment verification fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verification_status TEXT DEFAULT 'pending' CHECK (payment_verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add payment method options
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'pay_on_pickup' CHECK (payment_type IN ('gcash_full', 'gcash_partial', 'pay_on_pickup'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partial_payment_amount DECIMAL(10,2);

-- Update order status enum to include payment verification states
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction, so we'll handle this in the application logic

-- ============================================
-- Enable RLS for new columns
-- ============================================

-- Policies for payment verification (admin/shop_owner can update)
CREATE POLICY "Admins can update payment verification" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'shop_owner') AND p.role_status = 'approved'
    )
  );

-- ============================================
-- Functions for Payment Verification
-- ============================================

-- Function to update payment verification status
CREATE OR REPLACE FUNCTION public.update_payment_verification(
  p_order_id UUID,
  p_status TEXT,
  p_verified_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.orders
  SET
    payment_verification_status = p_status,
    payment_verified_at = CASE WHEN p_status = 'verified' THEN NOW() ELSE NULL END,
    payment_verified_by = CASE WHEN p_status IN ('verified', 'rejected') THEN p_verified_by ELSE NULL END,
    payment_notes = COALESCE(p_notes, payment_notes),
    status = CASE
      WHEN p_status = 'verified' AND payment_type = 'gcash_full' THEN 'confirmed'
      WHEN p_status = 'verified' AND payment_type = 'gcash_partial' THEN 'confirmed'
      WHEN p_status = 'rejected' THEN 'cancelled'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_payment_verification_status ON public.orders(payment_verification_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON public.orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_verified_at ON public.orders(payment_verified_at);

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON COLUMN public.orders.receipt_url IS 'URL of uploaded payment receipt screenshot in Supabase Storage';
COMMENT ON COLUMN public.orders.payment_verification_status IS 'Payment verification status: pending, verified, rejected';
COMMENT ON COLUMN public.orders.payment_verified_at IS 'Timestamp when payment was verified';
COMMENT ON COLUMN public.orders.payment_verified_by IS 'Admin user who verified the payment';
COMMENT ON COLUMN public.orders.payment_notes IS 'Notes from payment verification process';
COMMENT ON COLUMN public.orders.payment_type IS 'Payment method: gcash_full, gcash_partial, pay_on_pickup';
COMMENT ON COLUMN public.orders.partial_payment_amount IS 'Amount paid for partial payments';

COMMENT ON FUNCTION public.update_payment_verification IS 'Updates payment verification status and related order fields';