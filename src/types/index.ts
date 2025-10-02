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
  _id?: string; // MongoDB ID from backend
  id?: string; // Legacy ID for compatibility
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isGuest?: boolean;
  isAdmin?: boolean;
  profileComplete?: boolean;
}

export interface Measurement {
  _id?: string;
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
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
   userId: string;
   items: OrderItem[];
   totalAmount: number;
   status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
   shippingAddress: {
     street: string;
     city: string;
     state: string;
     zipCode: string;
     country: string;
   };
   paymentMethod: string;
   tailoringRequired: boolean;
   fabricType?: string; // selected fabric type
   materialProvidedByCustomer?: boolean; // true if customer provides material
   createdAt?: Date;
   updatedAt?: Date;
 }

export type OrderStatus =
  | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

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
  otp?: string;
}
