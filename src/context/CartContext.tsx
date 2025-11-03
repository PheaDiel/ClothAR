// src/context/CartContext.tsx
import React, { createContext, ReactNode, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { CartService } from '../services/cartService';
import { supabase } from '../services/supabase';

export type CartEntry = {
   itemId: string; // item id
   name: string;
   price: number;
   measurementId: string;
   measurementName: string;
   quantity: number;
   image?: string;
   fabricType?: string;
   materialProvidedByCustomer?: boolean;
   materialFee?: number;
  };

type CartContextType = {
   items: CartEntry[];
   add: (entry: CartEntry) => void;
   remove: (index: number) => void;
   updateQty: (index: number, qty: number) => void;
   clear: () => void;
   total: () => number;
   count: () => number;
   loadFromDatabase: () => Promise<void>;
   syncToDatabase: () => Promise<void>;
   isOnline: boolean;
 };

export const CartContext = createContext<CartContextType>({
   items: [],
   add: () => {},
   remove: () => {},
   updateQty: () => {},
   clear: () => {},
   total: () => 0,
   count: () => 0,
   loadFromDatabase: async () => {},
   syncToDatabase: async () => {},
   isOnline: true,
 });

export const CartProvider = ({ children }: { children: ReactNode }) => {
   const [items, setItems] = useState<CartEntry[]>([]);
   const [isOnline, setIsOnline] = useState(true);
   const { user } = useContext(AuthContext);

  const add = (entry: CartEntry) => {
    // merge same item+measurement
    const idx = items.findIndex((i) => i.itemId === entry.itemId && i.measurementId === entry.measurementId);
    if (idx >= 0) {
      const copy = [...items];
      copy[idx].quantity += entry.quantity;
      setItems(copy);
    } else {
      setItems((s) => [...s, entry]);
    }
  };

  const remove = (index: number) => setItems((s) => s.filter((_, i) => i !== index));

  const updateQty = (index: number, qty: number) => {
    setItems((s) => {
      const copy = [...s];
      copy[index] = { ...copy[index], quantity: Math.max(0, qty) };
      return copy;
    });
  };

  const clear = () => setItems([]);

  const total = () => items.reduce((acc, i) => acc + (i.price + (i.materialFee || 0)) * i.quantity, 0);

  const count = () => items.reduce((acc, i) => acc + i.quantity, 0);

  // Load cart from database on user login
  const loadFromDatabase = async () => {
    if (!user || user.id === 'guest') return;

    try {
      const result = await CartService.getCartItems();
      if (result.success && result.items) {
        // Transform database cart items to local format
        const transformedItems: CartEntry[] = result.items.map((dbItem: any) => ({
          itemId: dbItem.variant?.id || dbItem.itemId,
          name: dbItem.product?.name || dbItem.name,
          price: dbItem.unit_price || dbItem.price,
          measurementId: dbItem.measurement_id || dbItem.measurementId,
          measurementName: dbItem.user_measurements?.[0]?.name || dbItem.measurementName,
          quantity: dbItem.quantity,
          image: dbItem.product?.images?.[0] || dbItem.image,
          fabricType: dbItem.fabric_types?.[0]?.name || dbItem.fabricType,
          materialProvidedByCustomer: dbItem.material_provided_by_customer || dbItem.materialProvidedByCustomer,
          materialFee: dbItem.material_fee || dbItem.materialFee,
        }));
        setItems(transformedItems);
      }
    } catch (error) {
      console.error('Failed to load cart from database:', error);
      // Keep local cart as fallback
    }
  };

  // Sync current cart to database
  const syncToDatabase = async () => {
    if (!user || user.id === 'guest' || !isOnline) return;

    try {
      // Clear existing cart in database
      await CartService.clearCart();

      // Add all current items to database
      for (const item of items) {
        await CartService.addToCart(
          item.itemId,
          item.quantity,
          item.measurementId !== 'default' ? item.measurementId : undefined,
          undefined, // fabric_type_id
          undefined // customizations
        );
      }
    } catch (error) {
      console.error('Failed to sync cart to database:', error);
    }
  };

  // Load cart when user logs in
  useEffect(() => {
    if (user && user.id !== 'guest') {
      loadFromDatabase();
    } else if (user?.id === 'guest') {
      // Clear cart for guest users
      setItems([]);
    }
  }, [user]);

  // Monitor online status (React Native compatible)
  useEffect(() => {
    // For React Native, we can use NetInfo or assume online by default
    // Since this is a React Native app, window.addEventListener won't work
    setIsOnline(true); // Assume online for now, can be enhanced with NetInfo later
  }, []);

  return (
    <CartContext.Provider value={{
      items,
      add,
      remove,
      updateQty,
      clear,
      total,
      count,
      loadFromDatabase,
      syncToDatabase,
      isOnline
    }}>
      {children}
    </CartContext.Provider>
  );
};
