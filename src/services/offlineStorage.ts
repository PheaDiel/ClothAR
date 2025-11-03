// src/services/offlineStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartEntry } from '../context/CartContext';
import { Measurement } from '../types';

const CART_STORAGE_KEY = '@offline_cart';
const MEASUREMENTS_STORAGE_KEY = '@offline_measurements';
const PENDING_OPERATIONS_KEY = '@pending_operations';

export interface PendingOperation {
  id: string;
  type: 'cart_sync' | 'measurement_save' | 'order_submit';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineStorage {
  // Cart persistence
  async saveCartOffline(cartItems: CartEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart offline:', error);
    }
  }

  async loadCartOffline(): Promise<CartEntry[]> {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Failed to load cart offline:', error);
      return [];
    }
  }

  async clearCartOffline(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear offline cart:', error);
    }
  }

  // Measurements persistence
  async saveMeasurementsOffline(measurements: Measurement[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(measurements));
    } catch (error) {
      console.error('Failed to save measurements offline:', error);
    }
  }

  async loadMeasurementsOffline(): Promise<Measurement[]> {
    try {
      const measurementsData = await AsyncStorage.getItem(MEASUREMENTS_STORAGE_KEY);
      return measurementsData ? JSON.parse(measurementsData) : [];
    } catch (error) {
      console.error('Failed to load measurements offline:', error);
      return [];
    }
  }

  async clearMeasurementsOffline(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MEASUREMENTS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear offline measurements:', error);
    }
  }

  // Pending operations queue
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingOps = await this.getPendingOperations();
      const newOp: PendingOperation = {
        ...operation,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        retryCount: 0,
      };
      pendingOps.push(newOp);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
    } catch (error) {
      console.error('Failed to add pending operation:', error);
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const opsData = await AsyncStorage.getItem(PENDING_OPERATIONS_KEY);
      return opsData ? JSON.parse(opsData) : [];
    } catch (error) {
      console.error('Failed to get pending operations:', error);
      return [];
    }
  }

  async removePendingOperation(operationId: string): Promise<void> {
    try {
      const pendingOps = await this.getPendingOperations();
      const filteredOps = pendingOps.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filteredOps));
    } catch (error) {
      console.error('Failed to remove pending operation:', error);
    }
  }

  async updatePendingOperation(operationId: string, updates: Partial<PendingOperation>): Promise<void> {
    try {
      const pendingOps = await this.getPendingOperations();
      const index = pendingOps.findIndex(op => op.id === operationId);
      if (index !== -1) {
        pendingOps[index] = { ...pendingOps[index], ...updates };
        await AsyncStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pendingOps));
      }
    } catch (error) {
      console.error('Failed to update pending operation:', error);
    }
  }

  // Clear all offline data
  async clearAllOfflineData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CART_STORAGE_KEY),
        AsyncStorage.removeItem(MEASUREMENTS_STORAGE_KEY),
        AsyncStorage.removeItem(PENDING_OPERATIONS_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();