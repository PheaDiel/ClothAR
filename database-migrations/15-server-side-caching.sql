-- Migration 15: Server-side Caching for Performance Optimization
-- Run this in your Supabase SQL Editor after 14-performance-optimizations.sql
--
-- IMPORTANT: After running this script, you MUST run the index creation commands
-- separately in the SQL Editor (one at a time) because CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction block.

-- ============================================
-- Create Cache Management Tables
-- ============================================

-- Cache table for frequently accessed data
CREATE TABLE IF NOT EXISTS public.cache_entries (
    cache_key TEXT PRIMARY KEY,
    cache_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cache_type TEXT NOT NULL, -- 'products', 'categories', 'user_data', etc.
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Index Creation (Run Separately After This Script)
-- ============================================
--
-- Run these commands ONE AT A TIME in the Supabase SQL Editor after running the main migration:
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_type_expires
-- ON public.cache_entries(cache_type, expires_at)
-- WHERE expires_at > NOW();
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_entries_last_accessed
-- ON public.cache_entries(last_accessed_at DESC);

-- ============================================
-- Cache Management Functions
-- ============================================

-- Function to get cached data
CREATE OR REPLACE FUNCTION public.get_cached_data(p_cache_key TEXT, p_cache_type TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Try to get from cache
    SELECT cache_value INTO v_result
    FROM public.cache_entries
    WHERE cache_key = p_cache_key
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Update access statistics if found
    IF v_result IS NOT NULL THEN
        UPDATE public.cache_entries
        SET access_count = access_count + 1,
            last_accessed_at = NOW()
        WHERE cache_key = p_cache_key;
    END IF;

    RETURN v_result;
END;
$$;

-- Function to set cached data
CREATE OR REPLACE FUNCTION public.set_cached_data(
    p_cache_key TEXT,
    p_cache_value JSONB,
    p_cache_type TEXT,
    p_ttl_seconds INTEGER DEFAULT 300 -- 5 minutes default
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.cache_entries (cache_key, cache_value, cache_type, expires_at)
    VALUES (p_cache_key, p_cache_value, p_cache_type,
            CASE WHEN p_ttl_seconds > 0 THEN NOW() + INTERVAL '1 second' * p_ttl_seconds ELSE NULL END)
    ON CONFLICT (cache_key)
    DO UPDATE SET
        cache_value = EXCLUDED.cache_value,
        cache_type = EXCLUDED.cache_type,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW(),
        access_count = 0,
        last_accessed_at = NOW();
END;
$$;

-- Function to invalidate cache by type
CREATE OR REPLACE FUNCTION public.invalidate_cache_by_type(p_cache_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.cache_entries
    WHERE cache_type = p_cache_type;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- Function to invalidate specific cache entry
CREATE OR REPLACE FUNCTION public.invalidate_cache_entry(p_cache_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted BOOLEAN := FALSE;
BEGIN
    DELETE FROM public.cache_entries
    WHERE cache_key = p_cache_key;

    IF FOUND THEN
        v_deleted := TRUE;
    END IF;

    RETURN v_deleted;
END;
$$;

-- ============================================
-- Cached Product Functions
-- ============================================

-- Function to get cached products with automatic cache management
CREATE OR REPLACE FUNCTION public.get_products_cached(
    p_category TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
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
DECLARE
    v_cache_key TEXT;
    v_cached_data JSONB;
BEGIN
    -- Generate cache key
    v_cache_key := 'products_' || COALESCE(p_category, 'all') || '_' ||
                   COALESCE(p_search, '') || '_' || p_limit || '_' || p_offset;

    -- Try to get from cache first
    v_cached_data := public.get_cached_data(v_cache_key, 'products');

    IF v_cached_data IS NOT NULL THEN
        -- Return cached data
        RETURN QUERY SELECT * FROM jsonb_to_recordset(v_cached_data) AS x(
            id UUID, name TEXT, description TEXT, category TEXT, subcategory TEXT,
            brand TEXT, base_price DECIMAL(10,2), images JSONB, tags TEXT[],
            total_variants BIGINT, available_variants BIGINT, total_stock BIGINT,
            min_price DECIMAL(10,2), max_price DECIMAL(10,2), available_sizes TEXT[],
            available_colors TEXT[], created_at TIMESTAMPTZ
        );
    ELSE
        -- Get fresh data and cache it
        RETURN QUERY
        SELECT
            pl.id, pl.name, pl.description, pl.category, pl.subcategory, pl.brand,
            pl.base_price, pl.images, pl.tags, pl.total_variants, pl.available_variants,
            pl.total_stock, pl.min_price, pl.max_price, pl.available_sizes,
            pl.available_colors, pl.created_at
        FROM public.product_listings pl
        WHERE
            (p_category IS NULL OR pl.category = p_category) AND
            (p_search IS NULL OR
             pl.name ILIKE '%' || p_search || '%' OR
             pl.description ILIKE '%' || p_search || '%' OR
             pl.category ILIKE '%' || p_search || '%')
        ORDER BY
            CASE WHEN p_search IS NOT NULL THEN 0 ELSE 1 END,
            pl.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;

        -- Cache the results (TTL: 10 minutes for search results, 30 minutes for category browsing)
        IF p_search IS NOT NULL THEN
            -- Cache search results for shorter time
            PERFORM public.set_cached_data(v_cache_key, jsonb_agg(row_to_json(t)), 'products', 600);
        ELSE
            -- Cache category browsing for longer
            PERFORM public.set_cached_data(v_cache_key, jsonb_agg(row_to_json(t)), 'products', 1800);
        END IF;
    END IF;
END;
$$;

-- ============================================
-- Cache Maintenance Functions
-- ============================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.cache_entries
    WHERE expires_at IS NOT NULL AND expires_at <= NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS TABLE (
    cache_type TEXT,
    total_entries BIGINT,
    expired_entries BIGINT,
    total_access_count BIGINT,
    avg_access_count DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.cache_type,
        COUNT(*) as total_entries,
        COUNT(CASE WHEN ce.expires_at <= NOW() THEN 1 END) as expired_entries,
        SUM(ce.access_count) as total_access_count,
        ROUND(AVG(ce.access_count)::DECIMAL, 2) as avg_access_count
    FROM public.cache_entries ce
    GROUP BY ce.cache_type
    ORDER BY total_entries DESC;
END;
$$;

-- ============================================
-- Automatic Cache Invalidation Triggers
-- ============================================

-- Trigger to invalidate product cache when products are modified
CREATE OR REPLACE FUNCTION public.invalidate_product_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Invalidate all product-related cache entries
    PERFORM public.invalidate_cache_by_type('products');

    -- Also invalidate specific product cache if it's an update
    IF TG_OP = 'UPDATE' AND OLD.id = NEW.id THEN
        PERFORM public.invalidate_cache_entry('product_' || OLD.id::TEXT);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to products table
DROP TRIGGER IF EXISTS trigger_invalidate_product_cache ON public.products;
CREATE TRIGGER trigger_invalidate_product_cache
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_product_cache();

-- Trigger to invalidate product cache when variants are modified
CREATE OR REPLACE FUNCTION public.invalidate_variant_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Invalidate product cache when variants change
    PERFORM public.invalidate_cache_by_type('products');

    -- Invalidate specific product cache
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM public.invalidate_cache_entry('product_' || NEW.product_id::TEXT);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.invalidate_cache_entry('product_' || OLD.product_id::TEXT);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to product_variants table
DROP TRIGGER IF EXISTS trigger_invalidate_variant_cache ON public.product_variants;
CREATE TRIGGER trigger_invalidate_variant_cache
    AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_variant_cache();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.cache_entries IS 'Server-side cache storage for frequently accessed data';
COMMENT ON FUNCTION public.get_cached_data IS 'Retrieve data from cache with access tracking';
COMMENT ON FUNCTION public.set_cached_data IS 'Store data in cache with TTL support';
COMMENT ON FUNCTION public.invalidate_cache_by_type IS 'Clear all cache entries of a specific type';
COMMENT ON FUNCTION public.invalidate_cache_entry IS 'Clear a specific cache entry';
COMMENT ON FUNCTION public.get_products_cached IS 'Get products with automatic caching';
COMMENT ON FUNCTION public.cleanup_expired_cache IS 'Remove expired cache entries';
COMMENT ON FUNCTION public.get_cache_stats IS 'Get cache performance statistics';

-- ============================================
-- Initial Cache Population (Optional)
-- ============================================

-- Populate cache with popular categories on migration
-- SELECT public.set_cached_data('categories_popular', (
--     SELECT jsonb_agg(category) FROM (
--         SELECT category, COUNT(*) as count
--         FROM public.products
--         WHERE is_active = true
--         GROUP BY category
--         ORDER BY count DESC
--         LIMIT 10
--     ) t
-- ), 'categories', 3600); -- Cache for 1 hour