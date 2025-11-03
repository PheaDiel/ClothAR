-- Migration 08: Orders and Inventory Schema
-- Run this in your Supabase SQL Editor after 07-debug-trigger-fix.sql

-- ============================================
-- Inventory Management Tables
-- ============================================

-- Products/Catalog Items Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- shirt, pants, dress, etc.
  subcategory TEXT,
  brand TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  tags TEXT[], -- For search and filtering
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants (sizes, colors, etc.)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT, -- XS, S, M, L, XL, etc.
  color TEXT,
  color_hex TEXT, -- Hex color code
  price_modifier DECIMAL(10,2) DEFAULT 0, -- Additional cost for this variant
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  is_available BOOLEAN DEFAULT TRUE,
  weight_grams INT, -- For shipping calculations
  dimensions JSONB, -- length, width, height in cm
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, size, color)
);

-- Fabric Types Table
CREATE TABLE IF NOT EXISTS public.fabric_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  material_composition TEXT, -- e.g., "100% Cotton"
  care_instructions TEXT,
  price_per_meter DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Order Management Tables
-- ============================================

-- Shopping Cart Table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For anonymous users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  fabric_type_id UUID REFERENCES public.fabric_types(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  measurement_id UUID, -- References user's saved measurements
  customizations JSONB, -- Custom fit adjustments, notes, etc.
  material_provided_by_customer BOOLEAN DEFAULT FALSE,
  material_fee DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL, -- Price at time of adding to cart
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_variant_id, measurement_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- Auto-generated order number
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'tailoring', 'quality_check', 'ready_for_delivery', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'PHP',

  -- Shipping Information
  shipping_address JSONB NOT NULL,
  shipping_method TEXT DEFAULT 'standard',
  tracking_number TEXT,

  -- Payment Information
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,

  -- Tailoring Information
  requires_tailoring BOOLEAN DEFAULT FALSE,
  assigned_tailor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tailoring_notes TEXT,

  -- Timestamps
  order_date TIMESTAMPTZ DEFAULT NOW(),
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Snapshot of product name
  product_description TEXT, -- Snapshot of product description
  variant_details JSONB, -- Snapshot of size, color, etc.
  fabric_type_id UUID REFERENCES public.fabric_types(id) ON DELETE SET NULL,
  fabric_name TEXT, -- Snapshot of fabric name

  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  measurement_id UUID, -- References user's saved measurements
  measurement_snapshot JSONB, -- Snapshot of measurements used
  customizations JSONB, -- Custom fit adjustments, notes, etc.

  material_provided_by_customer BOOLEAN DEFAULT FALSE,
  material_fee DECIMAL(10,2) DEFAULT 0,

  -- Tailoring status for this item
  tailoring_status TEXT DEFAULT 'pending' CHECK (tailoring_status IN ('pending', 'assigned', 'in_progress', 'completed', 'quality_check', 'approved', 'rejected')),
  tailoring_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Business Logic Tables
-- ============================================

-- Tailor Profiles (extends user profiles)
CREATE TABLE IF NOT EXISTS public.tailor_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  description TEXT,
  specialties TEXT[], -- Types of clothing they specialize in
  experience_years INT,
  certifications TEXT[],
  portfolio_images JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INT DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  working_hours JSONB, -- Days and hours of operation
  location JSONB, -- Service area/location
  pricing JSONB, -- Service pricing structure
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop Profiles (for shop owners)
CREATE TABLE IF NOT EXISTS public.shop_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT NOT NULL,
  description TEXT,
  business_type TEXT CHECK (business_type IN ('tailor_shop', 'boutique', 'department_store', 'online_only')),
  address JSONB,
  contact_info JSONB,
  operating_hours JSONB,
  payment_methods TEXT[],
  delivery_options TEXT[],
  return_policy TEXT,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Measurements (saved measurement profiles)
CREATE TABLE IF NOT EXISTS public.user_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Casual Wear", "Formal Wear"
  is_default BOOLEAN DEFAULT FALSE,
  measurements JSONB NOT NULL, -- Complete measurement set
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_measurements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Products: Public read access
CREATE POLICY "Products are publicly viewable" ON public.products
  FOR SELECT USING (true);

-- Product Variants: Public read access
CREATE POLICY "Product variants are publicly viewable" ON public.product_variants
  FOR SELECT USING (true);

-- Fabric Types: Public read access
CREATE POLICY "Fabric types are publicly viewable" ON public.fabric_types
  FOR SELECT USING (true);

-- Carts: Users can manage their own carts
CREATE POLICY "Users can view their own cart" ON public.carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart" ON public.carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" ON public.carts
  FOR UPDATE USING (auth.uid() = user_id);

-- Cart Items: Users can manage items in their cart
CREATE POLICY "Users can view their cart items" ON public.cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_items.cart_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_items.cart_id
      AND user_id = auth.uid()
    )
  );

-- Orders: Users can view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order Items: Users can view items from their orders
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND user_id = auth.uid()
    )
  );

-- Tailor Profiles: Public read, tailors can update their own
CREATE POLICY "Tailor profiles are publicly viewable" ON public.tailor_profiles
  FOR SELECT USING (true);

CREATE POLICY "Tailors can update their own profile" ON public.tailor_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Tailors can insert their own profile" ON public.tailor_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Shop Profiles: Public read, shop owners can update their own
CREATE POLICY "Shop profiles are publicly viewable" ON public.shop_profiles
  FOR SELECT USING (true);

CREATE POLICY "Shop owners can update their own profile" ON public.shop_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Shop owners can insert their own profile" ON public.shop_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User Measurements: Users can manage their own measurements
CREATE POLICY "Users can view their own measurements" ON public.user_measurements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own measurements" ON public.user_measurements
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_tags ON public.products USING GIN(tags);

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX idx_product_variants_stock ON public.product_variants(stock_quantity) WHERE stock_quantity > 0;

CREATE INDEX idx_carts_user_id ON public.carts(user_id);
CREATE INDEX idx_carts_expires_at ON public.carts(expires_at);

CREATE INDEX idx_cart_items_cart_id ON public.cart_items(cart_id);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX idx_orders_assigned_tailor ON public.orders(assigned_tailor_id);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_tailoring_status ON public.order_items(tailoring_status);

CREATE INDEX idx_tailor_profiles_rating ON public.tailor_profiles(rating DESC);
CREATE INDEX idx_tailor_profiles_available ON public.tailor_profiles(is_available);

CREATE INDEX idx_shop_profiles_rating ON public.shop_profiles(rating DESC);
CREATE INDEX idx_shop_profiles_verified ON public.shop_profiles(is_verified);

CREATE INDEX idx_user_measurements_user_id ON public.user_measurements(user_id);
CREATE INDEX idx_user_measurements_default ON public.user_measurements(user_id, is_default);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INT;
  v_order_number TEXT;
BEGIN
  v_date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get next sequence number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INT)), 0) + 1
  INTO v_sequence
  FROM public.orders
  WHERE DATE(order_date) = CURRENT_DATE;

  v_order_number := v_date_part || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update cart updated_at
CREATE OR REPLACE FUNCTION public.update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.carts SET updated_at = NOW() WHERE id = NEW.cart_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart timestamp when items change
CREATE TRIGGER update_cart_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cart_updated_at();

-- Function to update order totals
CREATE OR REPLACE FUNCTION public.update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_subtotal DECIMAL(10,2) := 0;
  v_tax_amount DECIMAL(10,2) := 0;
  v_total DECIMAL(10,2) := 0;
BEGIN
  -- Determine order_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(total_price + material_fee), 0)
  INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Calculate tax (12% VAT for Philippines)
  v_tax_amount := v_subtotal * 0.12;

  -- Calculate total
  SELECT subtotal + tax_amount + shipping_amount - discount_amount
  INTO v_total
  FROM public.orders
  WHERE id = v_order_id;

  -- Update order totals
  UPDATE public.orders
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      total_amount = v_total,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain order totals
CREATE TRIGGER maintain_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_order_totals();

-- Function to clean up expired carts
CREATE OR REPLACE FUNCTION public.cleanup_expired_carts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.carts WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update product updated_at
CREATE OR REPLACE FUNCTION public.update_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_product_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_product_updated_at();

CREATE TRIGGER update_product_variant_timestamp
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_product_updated_at();

CREATE TRIGGER update_order_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_product_updated_at();

CREATE TRIGGER update_order_item_timestamp
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_updated_at();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.products IS 'Product catalog with basic information';
COMMENT ON TABLE public.product_variants IS 'Product variants including size, color, and inventory';
COMMENT ON TABLE public.fabric_types IS 'Available fabric types and their properties';
COMMENT ON TABLE public.carts IS 'Shopping carts for users and anonymous sessions';
COMMENT ON TABLE public.cart_items IS 'Items in shopping carts with customizations';
COMMENT ON TABLE public.orders IS 'Customer orders with full details';
COMMENT ON TABLE public.order_items IS 'Individual items within orders';
COMMENT ON TABLE public.tailor_profiles IS 'Extended profiles for tailors with business information';
COMMENT ON TABLE public.shop_profiles IS 'Extended profiles for shop owners';
COMMENT ON TABLE public.user_measurements IS 'Saved measurement profiles for users';

COMMENT ON FUNCTION public.generate_order_number IS 'Generates unique order numbers in format YYYYMMDDXXXX';
COMMENT ON FUNCTION public.cleanup_expired_carts IS 'Removes carts that have expired';
COMMENT ON FUNCTION public.update_order_totals IS 'Maintains order total calculations automatically';