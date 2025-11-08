import { supabase } from './supabase';

export interface PaymentReceipt {
  id: string;
  order_id: string;
  receipt_url: string;
  uploaded_at: string;
  verified: boolean;
}

export class PaymentService {
  /**
   * Upload payment receipt to Supabase Storage
   */
  static async uploadReceipt(orderId: string, imageUri: string): Promise<{ success: boolean; receiptUrl?: string; error?: string }> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create unique filename
      const fileName = `receipts/${orderId}_${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // Update order with receipt URL - use order_number instead of id for lookup
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          receipt_url: publicUrl,
          payment_verification_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('order_number', orderId);

      if (updateError) throw updateError;

      return { success: true, receiptUrl: publicUrl };
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify payment (admin only)
   */
  static async verifyPayment(
    orderId: string,
    status: 'verified' | 'rejected',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin/shop_owner
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!['admin', 'shop_owner'].includes(profile?.role)) {
        return { success: false, error: 'Unauthorized to verify payments' };
      }

      // First get the order ID from order number
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderId)
        .single();

      if (orderError) throw orderError;

      // Use the database function to update payment verification
      const { error } = await supabase.rpc('update_payment_verification', {
        p_order_id: orderData.id,
        p_status: status,
        p_verified_by: user.id,
        p_notes: notes
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get orders pending payment verification (admin only)
   */
  static async getPendingVerifications(): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            name,
            phone
          )
        `)
        .eq('payment_verification_status', 'pending')
        .not('receipt_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, orders };
    } catch (error: any) {
      console.error('Get pending verifications error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get GCash QR code URL (static)
   */
  static getGcashQrUrl(): string {
    // Return the static GCash QR code URL for Begino Tailoring
    // This should be replaced with the actual QR code image URL
    return 'https://example.com/gcash-qr-begino-tailoring.png';
  }

  /**
   * Calculate partial payment amount
   */
  static calculatePartialPayment(totalAmount: number, percentage: number = 50): number {
    return Math.round((totalAmount * percentage / 100) * 100) / 100; // Round to 2 decimal places
  }
}