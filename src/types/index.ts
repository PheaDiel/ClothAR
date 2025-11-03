export type Size = 'XS'|'S'|'M'|'L'|'XL';

export interface Item {
   id: string;
   name: string;
   price: number;
   images: (string | number)[]; // local (require) or remote URIs
   category: string;
   sizes: string[]; // available sizes
   stock: Record<string, number>; // quantity by size
   description?: string;
   fabricTypes?: string[]; // available fabric types like cotton, silk, etc.
 }

export interface User {
   id: string; // Supabase UUID
   name: string;
   email: string;
   phone?: string;
   role: 'customer' | 'tailor' | 'shop_owner';
   role_status: 'pending' | 'approved' | 'rejected';
   is_admin?: boolean; // Admin access flag
   province_code?: string;
   province_name?: string;
   city_code?: string;
   city_name?: string;
   barangay?: string;
   measurements?: {
     bust?: number;
     waist?: number;
     hip?: number;
     inseam?: number;
     shoulder?: number;
     sleeve?: number;
     neck?: number;
     chest?: number;
     armhole?: number;
     wrist?: number;
     thigh?: number;
     knee?: number;
     ankle?: number;
     outseam?: number;
   };
   profileComplete?: boolean;
   created_at: string;
   updated_at: string;
   // Enhanced account management fields
   full_name?: string;
   date_of_birth?: string; // ISO date string
   gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
   avatar_url?: string;
   marketing_email_consent?: boolean;
   notification_settings?: {
     email: {
       orders: boolean;
       promotions: boolean;
       updates: boolean;
     };
     push: {
       orders: boolean;
       promotions: boolean;
     };
   };
   verification_status?: 'pending' | 'verified' | 'reminded';
   verification_reminder_sent_at?: string;
   two_factor_enabled?: boolean;
   account_deletion_requested?: boolean;
   account_deletion_requested_at?: string;
   data_export_requested?: boolean;
   data_export_requested_at?: string;
}

export interface Profile {
   id: string;
   name: string;
   phone?: string;
   role: 'customer' | 'tailor' | 'shop_owner';
   role_status: 'pending' | 'approved' | 'rejected';
   is_admin?: boolean; // Admin access flag
   province_code?: string;
   province_name?: string;
   city_code?: string;
   city_name?: string;
   barangay?: string;
   measurements?: any; // JSONB
   profile_complete: boolean;
   created_at: string;
   updated_at: string;
   // Enhanced account management fields
   full_name?: string;
   date_of_birth?: string;
   gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
   avatar_url?: string;
   marketing_email_consent?: boolean;
   notification_settings?: any; // JSONB
   verification_status?: 'pending' | 'verified' | 'reminded';
   verification_reminder_sent_at?: string;
   two_factor_enabled?: boolean;
   account_deletion_requested?: boolean;
   account_deletion_requested_at?: string;
   data_export_requested?: boolean;
   data_export_requested_at?: string;
}

export interface Measurement {
   id?: string;
   _id?: string; // Keep for backward compatibility
   userId: string;
   name: string;
   measurements: {
     bust?: number;
     waist?: number;
     hip?: number;
     inseam?: number;
     shoulder?: number;
     sleeve?: number;
     neck?: number;
     chest?: number;
     armhole?: number;
     wrist?: number;
     thigh?: number;
     knee?: number;
     ankle?: number;
     outseam?: number;
   };
   notes?: string;
   isDefault?: boolean;
   is_default?: boolean; // Database field name
   createdAt?: Date;
   updatedAt?: Date;
   created_at?: string;
   updated_at?: string;
 }

export interface TailoringRequest {
  measurementId?: string;
  customizations?: string;
  notes?: string;
}

export interface OrderItem {
   itemId: string;
   name: string;
   price: number;
   measurementId: string;
   measurementName: string;
   quantity: number;
   tailoringRequest?: TailoringRequest;
   fabricType?: string;
   materialProvidedByCustomer?: boolean;
   materialFee?: number;
 }

export interface Order {
    _id?: string;
    id?: string;
    order_number?: string;
    userId: string;
    user_id?: string;
    items: OrderItem[];
    totalAmount: number;
    subtotal?: number;
    tax_amount?: number;
    shipping_amount?: number;
    discount_amount?: number;
    currency?: string;
    status: 'pending' | 'confirmed' | 'processing' | 'tailoring' | 'quality_check' | 'ready_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    shipping_address?: any;
    paymentMethod: string;
    payment_method?: string;
    payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_reference?: string;
    payment_type?: 'gcash_full' | 'gcash_partial' | 'pay_on_pickup';
    partial_payment_amount?: number;
    receipt_url?: string;
    payment_verification_status?: 'pending' | 'verified' | 'rejected';
    payment_verified_at?: string;
    payment_verified_by?: string;
    payment_notes?: string;
    tailoringRequired: boolean;
    requires_tailoring?: boolean;
    assigned_tailor_id?: string;
    tailoring_notes?: string;
    fabricType?: string; // selected fabric type
    materialProvidedByCustomer?: boolean; // true if customer provides material
    order_date?: string;
    estimated_delivery_date?: string;
    actual_delivery_date?: string;
    createdAt?: Date;
    updatedAt?: Date;
    created_at?: string;
    updated_at?: string;
  }

export type OrderStatus =
   | 'pending' | 'confirmed' | 'processing' | 'tailoring' | 'quality_check' | 'ready_for_delivery' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface CartItem {
  itemId: string;
  measurementId: string;
  measurementName: string;
  quantity: number;
}

export interface Notification {
  id: string;
  type: 'order_status' | 'tailoring_update' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  orderId?: string;
}

export interface PhilippineLocation {
  code: string;
  name: string;
}

export interface City extends PhilippineLocation {
  barangays: string[];
}

export interface Province extends PhilippineLocation {
  cities: City[];
}

export interface PhilippineLocations {
  provinces: Province[];
}

export interface RegistrationData {
    name: string;
    email: string;
    password: string;
    phone: string;
    province: Province | null;
    city: City | null;
    barangay: string | null;
    role_request: 'customer' | 'tailor' | 'shop_owner' | null;
    otp?: string;
    // Enhanced optional metadata
    full_name?: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    marketing_email_consent?: boolean;
    // Email verification fields
    userId?: string;
    emailVerified?: boolean;
 }

// AR Features
export interface ClothingItem {
   id: string;
   name: string;
   category: string;
   description?: string;
   sizes: any; // JSONB with size measurements
   colors: any; // JSONB with color data
   images: string[]; // Array of image URLs
   ar_model_url?: string;
   price?: number;
   in_stock: boolean;
   created_at: string;
   updated_at: string;
}

export interface UserPreferences {
   user_id: string;
   preferred_styles: string[];
   favorite_colors: string[];
   body_type?: string;
   skin_tone?: string;
   budget_range?: {
     min?: number;
     max?: number;
   };
   created_at: string;
   updated_at: string;
}

export interface UserFavorite {
   id: string;
   user_id: string;
   clothing_item_id: string;
   added_at: string;
}

// Account Management
export interface PasswordResetRequest {
   email: string;
}

export interface AccountDeletionRequest {
   reason?: string;
   confirm_deletion: boolean;
}

export interface DataExportRequest {
   include_sensitive_data?: boolean;
}

export interface NotificationSettings {
   email: {
     orders: boolean;
     promotions: boolean;
     updates: boolean;
   };
   push: {
     orders: boolean;
     promotions: boolean;
   };
}
