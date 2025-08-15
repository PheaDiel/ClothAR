import React, { createContext, ReactNode, useState, useEffect } from 'react';
import { Item } from '../types';
import { load, save } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

type InventoryContextType = {
  items: Item[];
  addItem: (payload: Omit<Item, 'id'>) => Promise<void>;
  editItem: (id: string, payload: Partial<Item>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

export const InventoryContext = createContext<InventoryContextType>({
  items: [],
  addItem: async () => {},
  editItem: async () => {},
  removeItem: async () => {},
  reload: async () => {},
});

const SAMPLE: Item[] = [
  {
    id: '1',
    name: 'Blue Hoodie',
    price: 29.99,
    images: ['./assets/images/placeholder.png'],
    category: 'Hoodies',
    sizes: { XS: 2, S: 5, M: 8, L: 3, XL: 1 },
    description: 'Comfy blue hoodie',
  },
  {
    id: '2',
    name: 'White Tee',
    price: 12.5,
    images: ['./assets/images/placeholder.png'],
    category: 'T-Shirts',
    sizes: { XS: 5, S: 10, M: 18, L: 12, XL: 6 },
    description: 'Basic white tee',
  },
];

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Item[]>([]);

  const reload = async () => {
    const loaded = await load('@inventory_items', null);
    if (!loaded) {
      await save('@inventory_items', SAMPLE);
      setItems(SAMPLE);
    } else {
      setItems(loaded);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const persist = async (next: Item[]) => {
    setItems(next);
    await save('@inventory_items', next);
  };

  const addItem = async (payload: Omit<Item, 'id'>) => {
    const item: Item = { id: uuidv4(), ...payload };
    await persist([item, ...items]);
  };

  const editItem = async (id: string, payload: Partial<Item>) => {
    const next = items.map(i => (i.id === id ? { ...i, ...payload } : i));
    await persist(next);
  };

  const removeItem = async (id: string) => {
    const next = items.filter(i => i.id !== id);
    await persist(next);
  };

  return (
    <InventoryContext.Provider value={{ items, addItem, editItem, removeItem, reload }}>
      {children}
    </InventoryContext.Provider>
  );
};
