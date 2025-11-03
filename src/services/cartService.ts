import { supabase } from './supabase';
import { CartItem } from '../types';

export class CartService {
  /**
   * Get or create user's cart
   */
  static async getOrCreateCart(): Promise<{ success: boolean; cart?: any; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let cartQuery = supabase.from('carts').select('id');

      if (user) {
        cartQuery = cartQuery.eq('user_id', user.id);
      } else {
        // For anonymous users, we'd need session management
        // For now, return error for anonymous users
        return { success: false, error: 'Anonymous carts not implemented yet' };
      }

      let { data: cart, error: cartError } = await cartQuery.single();

      if (cartError && cartError.code === 'PGRST116') {
        // Cart doesn't exist, create one
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({
            user_id: user.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          })
          .select()
          .single();

        if (createError) throw createError;
        cart = newCart;
      } else if (cartError) {
        throw cartError;
      }

      return { success: true, cart };
    } catch (error: any) {
      console.error('Get/create cart error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cart items with full product details
   */
  static async getCartItems(): Promise<{ success: boolean; items?: CartItem[]; error?: string }> {
    try {
      const cartResult = await this.getOrCreateCart();
      if (!cartResult.success || !cartResult.cart) {
        return { success: false, error: cartResult.error };
      }

      const { data: items, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          customizations,
          material_provided_by_customer,
          material_fee,
          unit_price,
          created_at,
          product_variants (
            id,
            sku,
            size,
            color,
            color_hex,
            stock_quantity,
            is_available,
            products (
              id,
              name,
              description,
              base_price,
              images,
              category
            )
          ),
          fabric_types (
            id,
            name,
            price_per_meter
          ),
          user_measurements (
            id,
            name,
            measurements
          )
        `)
        .eq('cart_id', cartResult.cart.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match CartItem interface
      const transformedItems: CartItem[] = (items || []).map(item => ({
        itemId: item.product_variants?.[0]?.products?.[0]?.id || '',
        measurementId: item.user_measurements?.[0]?.id || '',
        measurementName: item.user_measurements?.[0]?.name || 'Standard',
        quantity: item.quantity,
        customizations: item.customizations,
        materialProvidedByCustomer: item.material_provided_by_customer,
        materialFee: item.material_fee,
        fabricType: item.fabric_types?.[0]?.name,
        fabricTypeId: item.fabric_types?.[0]?.id,
        // Add product details
        product: {
          id: item.product_variants?.[0]?.products?.[0]?.id || '',
          name: item.product_variants?.[0]?.products?.[0]?.name || '',
          price: item.product_variants?.[0]?.products?.[0]?.base_price || 0,
          images: item.product_variants?.[0]?.products?.[0]?.images || [],
          category: item.product_variants?.[0]?.products?.[0]?.category || '',
          sizes: [item.product_variants?.[0]?.size || ''],
          stock: { [item.product_variants?.[0]?.size || '']: item.product_variants?.[0]?.stock_quantity || 0 }
        },
        variant: {
          size: item.product_variants?.[0]?.size || '',
          color: item.product_variants?.[0]?.color || '',
          sku: item.product_variants?.[0]?.sku || ''
        }
      }));

      return { success: true, items: transformedItems };
    } catch (error: any) {
      console.error('Get cart items error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    productVariantId: string,
    quantity: number,
    measurementId?: string,
    fabricTypeId?: string,
    customizations?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cartResult = await this.getOrCreateCart();
      if (!cartResult.success || !cartResult.cart) {
        return { success: false, error: cartResult.error };
      }

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartResult.cart.id)
        .eq('product_variant_id', productVariantId)
        .eq('measurement_id', measurementId || null)
        .single();

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Get product variant details for pricing
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select(`
            price_modifier,
            products (
              base_price
            )
          `)
          .eq('id', productVariantId)
          .single();

        if (variantError) throw variantError;

        const basePrice = variant.products?.[0]?.base_price || 0;
        const priceModifier = variant.price_modifier || 0;
        const fabricCost = fabricTypeId ? 0 : 0; // Calculate fabric cost if needed
        const unitPrice = basePrice + priceModifier + fabricCost;

        // Add new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartResult.cart.id,
            product_variant_id: productVariantId,
            fabric_type_id: fabricTypeId || null,
            measurement_id: measurementId || null,
            quantity,
            unit_price: unitPrice,
            customizations: customizations || null
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Add to cart error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(
    cartItemId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(cartItemId);
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', cartItemId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Update cart item error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(cartItemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Remove from cart error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const cartResult = await this.getOrCreateCart();
      if (!cartResult.success || !cartResult.cart) {
        return { success: false, error: cartResult.error };
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartResult.cart.id);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Clear cart error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cart total
   */
  static async getCartTotal(): Promise<{ success: boolean; total?: number; itemCount?: number; error?: string }> {
    try {
      const cartResult = await this.getOrCreateCart();
      if (!cartResult.success || !cartResult.cart) {
        return { success: false, error: cartResult.error };
      }

      const { data: items, error } = await supabase
        .from('cart_items')
        .select('quantity, unit_price, material_fee')
        .eq('cart_id', cartResult.cart.id);

      if (error) throw error;

      let total = 0;
      let itemCount = 0;

      for (const item of items || []) {
        total += (item.unit_price * item.quantity) + (item.material_fee || 0);
        itemCount += item.quantity;
      }

      return { success: true, total, itemCount };
    } catch (error: any) {
      console.error('Get cart total error:', error);
      return { success: false, error: error.message };
    }
  }
}