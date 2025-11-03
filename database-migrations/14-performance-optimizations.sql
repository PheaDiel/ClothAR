-- Migration 14: Performance Optimizations for Product Queries
-- Run this in your Supabase SQL Editor after 13-fix-audit-logs-rls.sql

-- ============================================
-- Additional Indexes for Product Performance
-- ============================================

-- Composite index for product listing queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_category_created
ON public.products(is_active, category, created_at DESC)
WHERE is_active = true;

-- Index for product search (GIN index for array operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search
ON public.products USING GIN (
    to_tsvector('english',
        COALESCE(name, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(category, '') || ' ' ||
        COALESCE(subcategory, '') || ' ' ||
        COALESCE(brand, '')
    )
);

-- Index for product tags search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tags_gin
ON public.products USING GIN (tags)
WHERE is_active = true;

-- Composite index for product variants (most queried combinations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_available_stock
ON public.product_variants(product_id, is_available, stock_quantity DESC)
WHERE is_available = true AND stock_quantity > 0;

-- Index for SKU lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_sku_lower
ON public.product_variants(lower(sku));

-- Index for low stock monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_low_stock
ON public.product_variants(product_id, stock_quantity)
WHERE stock_quantity <= low_stock_threshold AND is_available = true;

-- ============================================
-- Optimized Views for Common Queries
-- ============================================

-- View for product listings with aggregated variant data
CREATE OR REPLACE VIEW public.product_listings AS
SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.subcategory,
    p.brand,
    p.base_price,
    p.images,
    p.tags,
    p.created_at,
    p.updated_at,
    -- Aggregated variant data
    COUNT(pv.id) as total_variants,
    COUNT(CASE WHEN pv.is_available AND pv.stock_quantity > 0 THEN 1 END) as available_variants,
    COALESCE(SUM(pv.stock_quantity), 0) as total_stock,
    COALESCE(MIN(pv.price_modifier + p.base_price), p.base_price) as min_price,
    COALESCE(MAX(pv.price_modifier + p.base_price), p.base_price) as max_price,
    -- Available sizes and colors as arrays
    ARRAY_AGG(DISTINCT pv.size) FILTER (WHERE pv.size IS NOT NULL AND pv.is_available) as available_sizes,
    ARRAY_AGG(DISTINCT pv.color) FILTER (WHERE pv.color IS NOT NULL AND pv.is_available) as available_colors
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.description, p.category, p.subcategory, p.brand,
         p.base_price, p.images, p.tags, p.created_at, p.updated_at;

-- View for product search results
CREATE OR REPLACE VIEW public.product_search AS
SELECT
    p.id,
    p.name,
    p.description,
    p.category,
    p.subcategory,
    p.brand,
    p.base_price,
    p.images,
    p.tags,
    p.created_at,
    -- Search rank for relevance scoring
    ts_rank_cd(
        to_tsvector('english',
            COALESCE(p.name, '') || ' ' ||
            COALESCE(p.description, '') || ' ' ||
            COALESCE(p.category, '') || ' ' ||
            COALESCE(p.subcategory, '') || ' ' ||
            COALESCE(p.brand, '')
        ),
        plainto_tsquery('english', 'placeholder')
    ) as search_rank
FROM public.products p
WHERE p.is_active = true;

-- ============================================
-- Optimized Functions for Product Queries
-- ============================================

-- Function to get products with pagination and filtering
CREATE OR REPLACE FUNCTION public.get_products_paginated(
    p_category TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_min_price DECIMAL(10,2) DEFAULT NULL,
    p_max_price DECIMAL(10,2) DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    base_price DECIMAL(10,2),
    images JSONB,
    tags TEXT[],
    total_variants BIGINT,
    available_variants BIGINT,
    total_stock BIGINT,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    available_sizes TEXT[],
    available_colors TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.id,
        pl.name,
        pl.description,
        pl.category,
        pl.subcategory,
        pl.brand,
        pl.base_price,
        pl.images,
        pl.tags,
        pl.total_variants,
        pl.available_variants,
        pl.total_stock,
        pl.min_price,
        pl.max_price,
        pl.available_sizes,
        pl.available_colors,
        pl.created_at
    FROM public.product_listings pl
    WHERE
        (p_category IS NULL OR pl.category = p_category) AND
        (p_search IS NULL OR
         pl.name ILIKE '%' || p_search || '%' OR
         pl.description ILIKE '%' || p_search || '%' OR
         pl.category ILIKE '%' || p_search || '%' OR
         pl.brand ILIKE '%' || p_search || '%') AND
        (p_min_price IS NULL OR pl.min_price >= p_min_price) AND
        (p_max_price IS NULL OR pl.max_price <= p_max_price) AND
        (NOT p_in_stock_only OR pl.total_stock > 0)
    ORDER BY
        CASE WHEN p_search IS NOT NULL THEN 0 ELSE 1 END, -- Search results first
        pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get product variants efficiently
CREATE OR REPLACE FUNCTION public.get_product_variants_optimized(p_product_id UUID)
RETURNS TABLE (
    id UUID,
    sku TEXT,
    size TEXT,
    color TEXT,
    color_hex TEXT,
    price_modifier DECIMAL(10,2),
    stock_quantity INTEGER,
    is_available BOOLEAN,
    final_price DECIMAL(10,2)
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_base_price DECIMAL(10,2);
BEGIN
    -- Get base price once
    SELECT base_price INTO v_base_price
    FROM public.products
    WHERE id = p_product_id AND is_active = true;

    -- Return variants with calculated final price
    RETURN QUERY
    SELECT
        pv.id,
        pv.sku,
        pv.size,
        pv.color,
        pv.color_hex,
        pv.price_modifier,
        pv.stock_quantity,
        pv.is_available,
        v_base_price + pv.price_modifier as final_price
    FROM public.product_variants pv
    WHERE pv.product_id = p_product_id
    ORDER BY pv.is_available DESC, pv.stock_quantity DESC, pv.size, pv.color;
END;
$$;

-- Function for fast product search
CREATE OR REPLACE FUNCTION public.search_products_optimized(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2),
    images JSONB,
    search_rank REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Use full-text search for better performance
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.base_price,
        p.images,
        ts_rank_cd(
            to_tsvector('english',
                COALESCE(p.name, '') || ' ' ||
                COALESCE(p.description, '') || ' ' ||
                COALESCE(p.category, '') || ' ' ||
                COALESCE(p.subcategory, '') || ' ' ||
                COALESCE(p.brand, '')
            ),
            plainto_tsquery('english', p_query)
        ) as search_rank
    FROM public.products p
    WHERE
        p.is_active = true AND
        to_tsvector('english',
            COALESCE(p.name, '') || ' ' ||
            COALESCE(p.description, '') || ' ' ||
            COALESCE(p.category, '') || ' ' ||
            COALESCE(p.subcategory, '') || ' ' ||
            COALESCE(p.brand, '')
        ) @@ plainto_tsquery('english', p_query)
    ORDER BY search_rank DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- Performance Monitoring Functions
-- ============================================

-- Function to get query performance stats
CREATE OR REPLACE FUNCTION public.get_product_query_stats()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    last_used TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        i.indexname::TEXT,
        pg_size_pretty(pg_relation_size(i.indexname::regclass))::TEXT,
        s.idx_scan,
        s.last_idx_scan
    FROM pg_stat_user_indexes s
    JOIN pg_indexes i ON s.indexname = i.indexname
    JOIN pg_tables t ON i.tablename = t.tablename
    WHERE t.tablename IN ('products', 'product_variants', 'fabric_types')
    ORDER BY s.idx_scan DESC;
END;
$$;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON VIEW public.product_listings IS 'Optimized view for product listings with pre-aggregated variant data';
COMMENT ON VIEW public.product_search IS 'View for full-text search with ranking';
COMMENT ON FUNCTION public.get_products_paginated IS 'Efficient paginated product retrieval with filtering';
COMMENT ON FUNCTION public.get_product_variants_optimized IS 'Fast variant retrieval with calculated prices';
COMMENT ON FUNCTION public.search_products_optimized IS 'Full-text search with relevance ranking';
COMMENT ON FUNCTION public.get_product_query_stats IS 'Performance monitoring for product-related indexes';