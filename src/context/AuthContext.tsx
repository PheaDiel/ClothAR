import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { load, save } from '../services/storage';
import { Alert } from 'react-native';
import {
  loginUser as apiLogin,
  registerUser as apiRegister
} from '../services/api';
import {
  saveAuthToken,
  removeAuthToken,
  getCurrentUser,
  saveCurrentUser,
  removeCurrentUser
} from '../services/api';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string, address?: string) => Promise<boolean>;
  updateProfile: (name: string, address: string) => Promise<boolean>;
  logout: () => Promise<void>;
  proceedAsGuest: () => Promise<void>;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  register: async () => false,
  updateProfile: async () => false,
  logout: async () => {},
  proceedAsGuest: async () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Try to load user from the new API storage first
        const u = await getCurrentUser();
        if (u) {
          setUser(u);
        } else {
          // Fallback to old storage for migration
          const oldUser = await load('@user', null);
          if (oldUser) setUser(oldUser);
        }
      } catch (error) {
        // Error loading user
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      const u: User = {
        _id: response.user._id,
        id: response.user._id, // For compatibility
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone,
        address: response.user.address,
        isAdmin: response.user.isAdmin,
        isGuest: response.user.isGuest,
        profileComplete: response.user.profileComplete
      };
      
      setUser(u);
      await saveAuthToken(response.token);
      await saveCurrentUser(response.user);
      await save('@user', u); // Keep for compatibility
      return true;
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials.');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string, address?: string) => {
    try {
      const response = await apiRegister({ name, email, password, phone, address });
      const u: User = {
        _id: response.user._id,
        id: response.user._id, // For compatibility
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone,
        address: response.user.address,
        isAdmin: response.user.isAdmin,
        isGuest: response.user.isGuest,
        profileComplete: response.user.profileComplete
      };

      setUser(u);
      await saveAuthToken(response.token);
      await saveCurrentUser(response.user);
      await save('@user', u); // Keep for compatibility
      return true;
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again.');
      return false;
    }
  };

  const updateProfile = async (name: string, address: string) => {
    if (!user) return false;
    if (name.length < 2 || address.length < 5) {
      Alert.alert('Invalid', 'Please complete all fields correctly.');
      return false;
    }
    const updatedUser: User = { ...user, name, address, profileComplete: true };
    setUser(updatedUser);
    await save('@user', updatedUser);
    return true;
  };

  const logout = async () => {
    setUser(null);
    await removeAuthToken();
    await removeCurrentUser();
    await save('@user', null); // Keep for compatibility
  };

  const proceedAsGuest = async () => {
    const guest: User = { 
      id: 'guest', 
      name: 'Guest', 
      email: 'guest@local', 
      isGuest: true,
      profileComplete: false 
    };
    setUser(guest);
    await save('@user', guest);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, proceedAsGuest, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
