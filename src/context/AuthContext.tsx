import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { load, save } from '../services/storage';
import { Alert } from 'react-native';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  proceedAsGuest: () => Promise<void>;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  register: async () => false,
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
        const u = await load('@user', null);
        if (u) setUser(u);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    // Mock validation
    if (!email.includes('@') || password.length < 4) {
      Alert.alert('Invalid credentials', 'Please check your email and password.');
      return false;
    }
    const u: User = { id: email, name: email.split('@')[0], email };
    setUser(u);
    await save('@user', u);
    return true;
  };

  const register = async (name: string, email: string, password: string) => {
    if (!email.includes('@') || password.length < 4 || name.length < 2) {
      Alert.alert('Invalid', 'Please complete all fields correctly.');
      return false;
    }
    const u: User = { id: email, name, email };
    setUser(u);
    await save('@user', u);
    return true;
  };

  const logout = async () => {
    setUser(null);
    await save('@user', null);
  };

  const proceedAsGuest = async () => {
    const guest: User = { id: 'guest', name: 'Guest', email: 'guest@local', isGuest: true };
    setUser(guest);
    await save('@user', guest);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, proceedAsGuest, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
