-- Migration 15: Add Virtual Try-On Images Support
-- Run this in your Supabase SQL Editor after 14-performance-optimizations.sql

-- Add virtual_tryon_images field to products table
ALTER TABLE public.products
ADD COLUMN virtual_tryon_images JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.products.virtual_tryon_images IS 'Array of PNG image URLs specifically for virtual try-on overlays';

-- Create index for better query performance
CREATE INDEX idx_products_virtual_tryon ON public.products USING GIN(virtual_tryon_images) WHERE jsonb_array_length(virtual_tryon_images) > 0;

-- Update RLS policies if needed (virtual_tryon_images follows same rules as images)
-- No changes needed as products are publicly readable