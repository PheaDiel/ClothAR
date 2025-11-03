import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default 5 minutes
  key?: string;
}

class CacheService {
  private static instance: CacheService;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = 'clothar_cache_';

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: options.ttl || this.DEFAULT_TTL,
      };

      const serializedData = JSON.stringify(cacheEntry);
      await AsyncStorage.setItem(this.getCacheKey(key), serializedData);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const serializedData = await AsyncStorage.getItem(this.getCacheKey(key));
      if (!serializedData) return null;

      const cacheEntry: CacheEntry<T> = JSON.parse(serializedData);
      const now = Date.now();

      // Check if cache entry has expired
      if (now - cacheEntry.timestamp > cacheEntry.ttl) {
        await this.delete(key);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getCacheKey(key));
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      for (const key of cacheKeys) {
        const serializedData = await AsyncStorage.getItem(key);
        if (serializedData) {
          try {
            const cacheEntry = JSON.parse(serializedData);
            const now = Date.now();

            if (now - cacheEntry.timestamp > cacheEntry.ttl) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            // Invalid cache entry, remove it
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Cache clear expired error:', error);
    }
  }

  // Specialized methods for common use cases
  async getProducts(category?: string, limit = 50): Promise<any[] | null> {
    const key = `products_${category || 'all'}_${limit}`;
    return this.get<any[]>(key);
  }

  async setProducts(products: any[], category?: string, limit = 50): Promise<void> {
    const key = `products_${category || 'all'}_${limit}`;
    await this.set(key, products, { ttl: 10 * 60 * 1000 }); // 10 minutes for products
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const key = `user_profile_${userId}`;
    return this.get<any>(key);
  }

  async setUserProfile(userId: string, profile: any): Promise<void> {
    const key = `user_profile_${userId}`;
    await this.set(key, profile, { ttl: 30 * 60 * 1000 }); // 30 minutes for profile
  }

  async getOrders(userId: string): Promise<any[] | null> {
    const key = `orders_${userId}`;
    return this.get<any[]>(key);
  }

  async setOrders(userId: string, orders: any[]): Promise<void> {
    const key = `orders_${userId}`;
    await this.set(key, orders, { ttl: 5 * 60 * 1000 }); // 5 minutes for orders
  }
}

export default CacheService;