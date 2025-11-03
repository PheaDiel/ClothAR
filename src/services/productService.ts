import { supabase } from './supabase';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  base_price: number;
  images: string[];
  virtual_tryon_images: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size?: string;
  color?: string;
  color_hex?: string;
  price_modifier: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
  weight_grams?: number;
  dimensions?: any;
  created_at: string;
  updated_at: string;
}

export interface FabricType {
  id: string;
  name: string;
  description?: string;
  material_composition?: string;
  care_instructions?: string;
  price_per_meter: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ProductService {
  /**
   * Get all active products with variants (optimized with pagination)
   */
  static async getProducts(
    category?: string,
    limit = 50,
    offset = 0,
    search?: string,
    sortBy: 'created_at' | 'name' | 'base_price' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ success: boolean; products?: Product[]; totalCount?: number; hasMore?: boolean; error?: string }> {
    try {
      // Check cache first
      const cacheService = (await import('./cacheService')).default.getInstance();
      const cacheKey = `products_${category || 'all'}_${limit}_${offset}_${search || ''}_${sortBy}_${sortOrder}`;
      const cachedData = await cacheService.get<any>(cacheKey);

      if (cachedData) {
        return cachedData;
      }

      // Use optimized function for better performance
      const { data: products, error } = await supabase
        .rpc('get_products_paginated', {
          p_category: category,
          p_search: search || null,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        // Fallback to original query if RPC fails
        console.warn('RPC failed, using fallback query:', error);
        return this.getProductsFallback(category, limit, offset, search, sortBy, sortOrder);
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Transform the data to match expected format
      const transformedProducts = products?.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        brand: product.brand,
        base_price: product.base_price,
        images: product.images,
        virtual_tryon_images: product.virtual_tryon_images || [],
        tags: product.tags,
        is_active: true,
        created_at: product.created_at,
        updated_at: product.updated_at,
        // Add aggregated data
        total_variants: product.total_variants,
        available_variants: product.available_variants,
        total_stock: product.total_stock,
        min_price: product.min_price,
        max_price: product.max_price,
        available_sizes: product.available_sizes,
        available_colors: product.available_colors
      })) || [];

      const result = {
        success: true,
        products: transformedProducts,
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };

      // Cache the result
      await cacheService.set(cacheKey, result, { ttl: 10 * 60 * 1000 }); // 10 minutes

      return result;
    } catch (error: any) {
      console.error('Get products error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fallback method for getProducts when optimized RPC is not available
   */
  private static async getProductsFallback(
    category?: string,
    limit = 50,
    offset = 0,
    search?: string,
    sortBy: 'created_at' | 'name' | 'base_price' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ success: boolean; products?: Product[]; totalCount?: number; hasMore?: boolean; error?: string }> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_variants (
            id,
            sku,
            size,
            color,
            color_hex,
            price_modifier,
            stock_quantity,
            is_available
          )
        `, { count: 'exact' })
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
      }

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        products,
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error: any) {
      console.error('Get products fallback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get product by ID with full details (optimized)
   */
  static async getProduct(productId: string): Promise<{ success: boolean; product?: Product & { variants: ProductVariant[] }; error?: string }> {
    try {
      // Use optimized function for variants
      const [productResult, variantsResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('is_active', true)
          .single(),
        supabase.rpc('get_product_variants_optimized', { p_product_id: productId })
      ]);

      if (productResult.error) throw productResult.error;

      const product = productResult.data;
      const variants = variantsResult.data || [];

      return {
        success: true,
        product: {
          ...product,
          variants: variants.map((v: any) => ({
            id: v.id,
            product_id: productId,
            sku: v.sku,
            size: v.size,
            color: v.color,
            color_hex: v.color_hex,
            price_modifier: v.price_modifier,
            stock_quantity: v.stock_quantity,
            low_stock_threshold: 5, // Default value
            is_available: v.is_available,
            weight_grams: null,
            dimensions: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        }
      };
    } catch (error: any) {
      console.error('Get product error:', error);
      // Fallback to original method
      return this.getProductFallback(productId);
    }
  }

  /**
   * Fallback method for getProduct when optimized RPC is not available
   */
  private static async getProductFallback(productId: string): Promise<{ success: boolean; product?: Product & { variants: ProductVariant[] }; error?: string }> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      return { success: true, product };
    } catch (error: any) {
      console.error('Get product fallback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get product variant by ID
   */
  static async getProductVariant(variantId: string): Promise<{ success: boolean; variant?: ProductVariant & { product: Product }; error?: string }> {
    try {
      const { data: variant, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          products (*)
        `)
        .eq('id', variantId)
        .single();

      if (error) throw error;

      return { success: true, variant };
    } catch (error: any) {
      console.error('Get product variant error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all fabric types
   */
  static async getFabricTypes(): Promise<{ success: boolean; fabrics?: FabricType[]; error?: string }> {
    try {
      const { data: fabrics, error } = await supabase
        .from('fabric_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return { success: true, fabrics };
    } catch (error: any) {
      console.error('Get fabric types error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search products by name, description, or tags (optimized)
   */
  static async searchProducts(query: string, limit = 20): Promise<{ success: boolean; products?: Product[]; error?: string }> {
    try {
      // Use optimized search function
      const { data: searchResults, error } = await supabase
        .rpc('search_products_optimized', {
          p_query: query,
          p_limit: limit
        });

      if (error) {
        // Fallback to original search if RPC fails
        console.warn('Optimized search failed, using fallback:', error);
        return this.searchProductsFallback(query, limit);
      }

      // Get full product data for search results
      if (searchResults && searchResults.length > 0) {
        const productIds = searchResults.map((r: any) => r.id);
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            product_variants (
              id,
              sku,
              size,
              color,
              color_hex,
              price_modifier,
              stock_quantity,
              is_available
            )
          `)
          .in('id', productIds)
          .eq('is_active', true);

        if (productsError) throw productsError;

        // Sort by search relevance
        const sortedProducts = products?.sort((a, b) => {
          const aRank = searchResults.find((r: any) => r.id === a.id)?.search_rank || 0;
          const bRank = searchResults.find((r: any) => r.id === b.id)?.search_rank || 0;
          return bRank - aRank;
        });

        return { success: true, products: sortedProducts };
      }

      return { success: true, products: [] };
    } catch (error: any) {
      console.error('Search products error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fallback method for searchProducts when optimized RPC is not available
   */
  private static async searchProductsFallback(query: string, limit = 20): Promise<{ success: boolean; products?: Product[]; error?: string }> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (
            id,
            sku,
            size,
            color,
            color_hex,
            price_modifier,
            stock_quantity,
            is_available
          )
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name')
        .limit(limit);

      if (error) throw error;

      return { success: true, products };
    } catch (error: any) {
      console.error('Search products fallback error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string): Promise<{ success: boolean; products?: Product[]; error?: string }> {
    return this.getProducts(category);
  }

  /**
   * Check product availability
   */
  static async checkAvailability(variantId: string, quantity: number): Promise<{ success: boolean; available?: boolean; availableQuantity?: number; error?: string }> {
    try {
      const { data: variant, error } = await supabase
        .from('product_variants')
        .select('stock_quantity, is_available')
        .eq('id', variantId)
        .single();

      if (error) throw error;

      const available = variant.is_available && variant.stock_quantity >= quantity;

      return {
        success: true,
        available,
        availableQuantity: variant.stock_quantity
      };
    } catch (error: any) {
      console.error('Check availability error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update product stock (for admin/tailor use)
   */
  static async updateStock(variantId: string, newQuantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin or tailor/shop owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!['admin', 'tailor', 'shop_owner'].includes(profile?.role)) {
        return { success: false, error: 'Unauthorized to update stock' };
      }

      const { error } = await supabase
        .from('product_variants')
        .update({
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', variantId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Update stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get low stock products (for admin/tailor use)
   */
  static async getLowStockProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: products, error } = await supabase
        .from('product_variants')
        .select(`
          stock_quantity,
          low_stock_threshold,
          products (
            id,
            name,
            category
          )
        `)
        .lte('stock_quantity', 'low_stock_threshold')
        .eq('is_available', true);

      if (error) throw error;

      return { success: true, products };
    } catch (error: any) {
      console.error('Get low stock products error:', error);
      return { success: false, error: error.message };
    }
  }
}