import { supabase } from './supabase';
import { Order, OrderItem, CartItem } from '../types';
import { NotificationService } from './notificationService';

export class OrderService {
  /**
   * Create a new order from cart items
   */
  static async createOrder(
    cartItems: CartItem[],
    shippingAddress: any,
    paymentMethod: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user's cart
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!cart) {
        return { success: false, error: 'No cart found' };
      }

      // Get cart items with full details
      const { data: cartItemsData, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product_variants (
            id,
            sku,
            size,
            color,
            color_hex,
            price_modifier,
            products (
              id,
              name,
              description,
              base_price,
              images
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
        .eq('cart_id', cart.id);

      if (cartError) throw cartError;

      // Calculate totals
      let subtotal = 0;
      const orderItems: any[] = [];

      for (const item of cartItemsData || []) {
        const basePrice = item.product_variants?.products?.base_price || 0;
        const priceModifier = item.product_variants?.price_modifier || 0;
        const fabricCost = item.material_provided_by_customer ? 0 :
          (item.fabric_types?.price_per_meter || 0) * 2; // Assume 2 meters per item

        const unitPrice = basePrice + priceModifier + fabricCost + item.material_fee;
        const totalPrice = unitPrice * item.quantity;

        subtotal += totalPrice;

        orderItems.push({
          product_variant_id: item.product_variant_id,
          product_name: item.product_variants?.products?.name || 'Unknown Product',
          product_description: item.product_variants?.products?.description,
          variant_details: {
            size: item.product_variants?.size,
            color: item.product_variants?.color,
            color_hex: item.product_variants?.color_hex,
            sku: item.product_variants?.sku
          },
          fabric_type_id: item.fabric_type_id,
          fabric_name: item.fabric_types?.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          measurement_id: item.measurement_id,
          measurement_snapshot: item.user_measurements?.measurements,
          customizations: item.customizations,
          material_provided_by_customer: item.material_provided_by_customer,
          material_fee: item.material_fee
        });
      }

      const taxAmount = subtotal * 0.12; // 12% VAT
      const shippingAmount = subtotal > 1000 ? 0 : 150; // Free shipping over ₱1000
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumberData,
          user_id: user.id,
          total_amount: totalAmount,
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          shipping_address: shippingAddress,
          payment_method: paymentMethod,
          payment_type: paymentMethod,
          requires_tailoring: orderItems.some(item => item.measurement_id),
          status: paymentMethod === 'pay_on_pickup' ? 'pending' : 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: order.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsWithOrderId);

      if (itemsError) throw itemsError;

      // Clear cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      return { success: true, order };
    } catch (error: any) {
      console.error('Order creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's orders
   */
  static async getUserOrders(): Promise<{ success: boolean; orders?: Order[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product_variants (
              size,
              color,
              products (
                name,
                images
              )
            ),
            fabric_types (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, orders };
    } catch (error: any) {
      console.error('Get orders error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get order by ID
   */
  static async getOrder(orderId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product_variants (
              size,
              color,
              products (
                name,
                images
              )
            ),
            fabric_types (
              name
            )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return { success: true, order };
    } catch (error: any) {
      console.error('Get order error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update order status (for admins/tailors)
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin or assigned tailor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const { data: order } = await supabase
        .from('orders')
        .select('assigned_tailor_id')
        .eq('id', orderId)
        .single();

      if (profile?.role !== 'admin' && order?.assigned_tailor_id !== user.id) {
        return { success: false, error: 'Unauthorized to update order status' };
      }

      const updateData: any = { status };
      if (notes) updateData.tailoring_notes = notes;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Send notification for status update
      try {
        await NotificationService.sendOrderStatusNotification(orderId, status);
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
        // Don't fail the status update if notification fails
      }

      return { success: true };
    } catch (error: any) {
      console.error('Update order status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if order can be cancelled (only pending/confirmed orders)
      const { data: order } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (!order || !['pending', 'confirmed'].includes(order.status)) {
        return { success: false, error: 'Order cannot be cancelled at this stage' };
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          tailoring_notes: reason || 'Cancelled by customer'
        })
        .eq('id', orderId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Cancel order error:', error);
      return { success: false, error: error.message };
    }
  }
}