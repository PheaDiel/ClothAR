// src/context/CartContext.tsx
import React, { createContext, ReactNode, useState } from 'react';

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
};

export const CartContext = createContext<CartContextType>({
  items: [],
  add: () => {},
  remove: () => {},
  updateQty: () => {},
  clear: () => {},
  total: () => 0,
  count: () => 0,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartEntry[]>([]);

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

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
};
