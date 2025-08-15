export type Size = 'XS'|'S'|'M'|'L'|'XL';

export interface Item {
  id: string;
  name: string;
  price: number;
  images: string[]; // local or remote URIs
  category: string;
  sizes: Record<Size, number>; // quantity by size
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
  isAdmin?: boolean;
}

export type OrderStatus =
  | 'Pending' | 'Confirmed' | 'Packed' | 'OutForDelivery' | 'Delivered' | 'ReadyForPickup' | 'Cancelled';

export interface CartItem {
  itemId: string;
  size: Size;
  quantity: number;
}
