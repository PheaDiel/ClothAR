// src/context/CartContext.tsx
import React, { createContext, ReactNode, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { CartService } from '../services/cartService';
import { supabase } from '../services/supabase';
import { offlineStorage } from '../services/offlineStorage';
import { useNetwork } from './NetworkContext';
import { useToast } from './ToastContext';

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
   const { isConnected, isInternetReachable } = useNetwork();
   const { showSuccess, showError, showInfo } = useToast();

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

    // Save to offline storage
    offlineStorage.saveCartOffline(items);

    // Show success feedback
    showSuccess(`${entry.name} added to cart`);

    // Try to sync to database if online
    if (isConnected && isInternetReachable !== false && user && user.id !== 'guest') {
      syncToDatabase().catch(error => {
        console.error('Failed to sync cart to database:', error);
        // Add to pending operations for retry later
        offlineStorage.addPendingOperation({
          type: 'cart_sync',
          data: { items: [...items, entry] }
        });
      });
    }
  };

  const remove = (index: number) => {
    const itemToRemove = items[index];
    setItems((s) => s.filter((_, i) => i !== index));

    // Save to offline storage
    const updatedItems = items.filter((_, i) => i !== index);
    offlineStorage.saveCartOffline(updatedItems);

    // Show feedback
    showInfo(`${itemToRemove?.name || 'Item'} removed from cart`);

    // Try to sync to database if online
    if (isConnected && isInternetReachable !== false && user && user.id !== 'guest') {
      syncToDatabase().catch(error => {
        console.error('Failed to sync cart to database:', error);
      });
    }
  };

  const updateQty = (index: number, qty: number) => {
    setItems((s) => {
      const copy = [...s];
      copy[index] = { ...copy[index], quantity: Math.max(0, qty) };
      return copy;
    });
  };

  const clear = () => {
    setItems([]);

    // Clear offline storage
    offlineStorage.clearCartOffline();

    // Show feedback
    showInfo('Cart cleared');

    // Try to sync to database if online
    if (isConnected && isInternetReachable !== false && user && user.id !== 'guest') {
      syncToDatabase().catch(error => {
        console.error('Failed to sync cart to database:', error);
      });
    }
  };

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
        // Save to offline storage as backup
        offlineStorage.saveCartOffline(transformedItems);
        showSuccess('Cart loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load cart from database:', error);
      // Try to load from offline storage as fallback
      try {
        const offlineCart = await offlineStorage.loadCartOffline();
        if (offlineCart.length > 0) {
          setItems(offlineCart);
          showInfo('Loaded cart from offline storage');
        }
      } catch (offlineError) {
        console.error('Failed to load offline cart:', offlineError);
        showError('Failed to load cart. Please try again.');
      }
    }
  };

  // Sync current cart to database
  const syncToDatabase = async () => {
    if (!user || user.id === 'guest' || !isConnected || isInternetReachable === false) {
      return;
    }

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

      // Clear any pending cart sync operations
      const pendingOps = await offlineStorage.getPendingOperations();
      const cartSyncOps = pendingOps.filter(op => op.type === 'cart_sync');
      for (const op of cartSyncOps) {
        await offlineStorage.removePendingOperation(op.id);
      }

      showSuccess('Cart synced successfully');
    } catch (error) {
      console.error('Failed to sync cart to database:', error);
      showError('Failed to sync cart. Changes saved locally.');

      // Add to pending operations for retry
      await offlineStorage.addPendingOperation({
        type: 'cart_sync',
        data: { items }
      });
    }
  };

  // Load cart when user logs in
  useEffect(() => {
    if (user && user.id !== 'guest') {
      loadFromDatabase();
    } else if (user?.id === 'guest') {
      // Load from offline storage for guest users
      offlineStorage.loadCartOffline().then(offlineCart => {
        if (offlineCart.length > 0) {
          setItems(offlineCart);
        }
      }).catch(error => {
        console.error('Failed to load offline cart for guest:', error);
      });
    }
  }, [user]);

  // Monitor online status and sync when back online
  useEffect(() => {
    const currentOnline = isConnected && isInternetReachable !== false;
    setIsOnline(currentOnline);

    // If we just came back online, try to sync pending operations
    if (currentOnline && user && user.id !== 'guest') {
      // Process pending cart sync operations
      offlineStorage.getPendingOperations().then(pendingOps => {
        const cartSyncOps = pendingOps.filter(op => op.type === 'cart_sync');
        if (cartSyncOps.length > 0) {
          showInfo('Syncing cart data...', 3000);
          syncToDatabase().catch(error => {
            console.error('Failed to sync pending cart operations:', error);
          });
        }
      });
    }
  }, [isConnected, isInternetReachable, user]);

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
