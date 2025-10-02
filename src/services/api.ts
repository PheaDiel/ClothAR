import AsyncStorage from '@react-native-async-storage/async-storage';
import { Measurement } from '../types';

// Configuration
const API_BASE_URL = __DEV__ ? 'http://localhost:3000/api' : 'https://your-production-api.com/api';

// Types
export interface ClothingItem {
  id: string;
  name: string;
  price: number;
  sizes: string[];
  images: (string | number)[];
  stock: Record<string, number>;
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isAdmin: boolean;
  isGuest: boolean;
  profileComplete: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface Order {
  _id: string;
  userId: string;
  items: Array<{
    itemId: string;
    name: string;
    price: number;
    measurementId: string;
    measurementName: string;
    quantity: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to make authenticated requests
const makeRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Authentication APIs
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  return makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}): Promise<LoginResponse> => {
  return makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Inventory APIs
export const getClothingItems = async (): Promise<ClothingItem[]> => {
  return makeRequest('/inventory/items');
};

export const createClothingItem = async (itemData: {
  name: string;
  price: number;
  sizes: string[];
  images: string[];
  stock: Record<string, number>;
  description?: string;
  category?: string;
}): Promise<ClothingItem> => {
  return makeRequest('/inventory/items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
};

export const updateClothingItem = async (itemId: string, updates: Partial<ClothingItem>): Promise<ClothingItem> => {
  return makeRequest(`/inventory/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteClothingItem = async (itemId: string): Promise<{ message: string }> => {
  return makeRequest(`/inventory/items/${itemId}`, {
    method: 'DELETE',
  });
};

// Order APIs
export const placeOrder = async (orderData: {
  items: Array<{
    itemId: string;
    name: string;
    price: number;
    measurementId: string;
    measurementName: string;
    quantity: number;
  }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
}): Promise<Order> => {
  return makeRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};

export const getUserOrders = async (): Promise<Order[]> => {
  return makeRequest('/orders/user');
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  return makeRequest(`/orders/${orderId}`);
};

// Business Location API
export const getBusinessLocation = async (): Promise<{ latitude: number; longitude: number; address: string; name: string }> => {
  return makeRequest('/business-location');
};

// Health check
export const checkApiHealth = async (): Promise<{ status: string; timestamp: string }> => {
  return makeRequest('/health');
};

// Token management
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error saving auth token:', error);
  }
};

export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userString = await AsyncStorage.getItem('currentUser');
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const saveCurrentUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving current user:', error);
  }
};

export const removeCurrentUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Error removing current user:', error);
  }
};

// Measurement APIs
export const getUserMeasurements = async (): Promise<Measurement[]> => {
  return makeRequest('/measurements/user');
};

export const createMeasurement = async (measurementData: {
  name: string;
  measurements: Record<string, number>;
  notes?: string;
  isDefault: boolean;
}): Promise<Measurement> => {
  return makeRequest('/measurements', {
    method: 'POST',
    body: JSON.stringify(measurementData),
  });
};

export const updateMeasurement = async (measurementId: string, updates: Partial<Measurement>): Promise<Measurement> => {
  return makeRequest(`/measurements/${measurementId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteMeasurement = async (measurementId: string): Promise<{ message: string }> => {
  return makeRequest(`/measurements/${measurementId}`, {
    method: 'DELETE',
  });
};
