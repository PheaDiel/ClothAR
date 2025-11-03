import React, { createContext, ReactNode, useState, useEffect } from 'react';
import { Item } from '../types';
import { load, save } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';
import { ProductService } from '../services/productService';

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
    price: 699,
    images: ['https://lemuta.com/cdn/shop/files/Unbenannt-6.webp?crop=center&height=1200&v=1718879931&width=1200'],
    category: 'Hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 2, S: 5, M: 8, L: 3, XL: 1 },
    description: 'Comfy blue hoodie',
    fabricTypes: ['Cotton', 'Fleece'],
  },
  {
    id: '2',
    name: 'White Tee',
    price: 150,
    images: ['https://i.etsystatic.com/53627910/r/il/fb3cbnpf/6187582920/il_570xN.6187582920_3v69.jpg'],
    category: 'T-Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 5, S: 10, M: 18, L: 12, XL: 6 },
    description: 'Basic white tee',
    fabricTypes: ['Cotton'],
  },
  {
    id: '3',
    name: 'Casual T-Shirt',
    price: 250,
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop'],
    category: 'T-Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 10, S: 15, M: 20, L: 15, XL: 10 },
    description: 'Comfortable casual t-shirt perfect for everyday wear',
    fabricTypes: ['Cotton', 'Polyester Blend'],
  },
  {
    id: '4',
    name: 'Formal Blazer',
    price: 1500,
    images: ['https://m.media-amazon.com/images/I/61O1Jk6uEEL._UY1000_.jpg'],
    category: 'Blazers',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 5, S: 8, M: 12, L: 8, XL: 5 },
    description: 'Elegant formal blazer for professional occasions',
    fabricTypes: ['Wool', 'Polyester', 'Cotton Blend'],
  },
  {
    id: '5',
    name: 'Pants',
    price: 800,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop'],
    category: 'Pants',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 7, S: 12, M: 18, L: 12, XL: 7 },
    description: 'Versatile pants suitable for various occasions',
    fabricTypes: ['Cotton', 'Denim', 'Polyester'],
  },
  {
    id: '6',
    name: 'Elegant Dress',
    price: 1200,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=600&fit=crop'],
    category: 'Dresses',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 5, S: 10, M: 15, L: 10, XL: 5 },
    description: 'Beautiful elegant dress perfect for special occasions',
    fabricTypes: ['Silk', 'Chiffon', 'Cotton Blend'],
  },
  {
    id: '7',
    name: 'Casual Blazer',
    price: 950,
    images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop'],
    category: 'Blazers',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 6, S: 12, M: 18, L: 12, XL: 6 },
    description: 'Stylish casual blazer perfect for business casual occasions',
    fabricTypes: ['Cotton', 'Linen', 'Polyester Blend'],
  },
];

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<Item[]>([]);

  const reload = async () => {
    try {
      // Try to load real products from database first
      const result = await ProductService.getProducts();
      if (result.success && result.products) {
        // Transform database products to Item format
        const transformedItems: Item[] = result.products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.base_price,
          images: product.images,
          category: product.category,
          sizes: [], // Will be populated from variants if needed
          stock: {}, // Will be populated from variants if needed
          description: product.description || '',
          fabricTypes: [], // Will be populated if available
        }));
        setItems(transformedItems);
        await save('@inventory_items', transformedItems);
      } else {
        // Fallback to sample data if database is not available
        console.warn('Failed to load products from database, using sample data');
        setItems(SAMPLE);
        await save('@inventory_items', SAMPLE);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      // Fallback to sample data
      setItems(SAMPLE);
      await save('@inventory_items', SAMPLE);
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
