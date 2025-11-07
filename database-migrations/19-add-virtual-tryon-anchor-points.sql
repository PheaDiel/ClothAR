-- Add virtual try-on anchor points to products table
-- This migration adds support for defining anchor points on virtual try-on PNG images

ALTER TABLE products
ADD COLUMN virtual_tryon_anchor_points JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN products.virtual_tryon_anchor_points IS 'Array of anchor point definitions for virtual try-on images. Each item contains: {imageIndex: number, anchorPoints: [{name: string, x: number, y: number, type: "shoulder"|"hip"|"neck"|"waist"}]}';

-- Create index for better query performance on anchor points
CREATE INDEX idx_products_virtual_tryon_anchor_points ON products USING GIN (virtual_tryon_anchor_points);

-- Add RLS policy for anchor points (same as other product fields)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for anchor points access (same as existing policies)
CREATE POLICY "Products are viewable by everyone" ON products
FOR SELECT USING (true);

CREATE POLICY "Products are editable by admins only" ON products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);