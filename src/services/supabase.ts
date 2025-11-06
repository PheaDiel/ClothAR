import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '../config/env'

// Use centralized configuration
const supabaseUrl = supabaseConfig.url
const supabaseAnonKey = supabaseConfig.anonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: {
      getItem: async (key: string) => {
        try {
          const value = await AsyncStorage.getItem(key);
          return value;
        } catch (error) {
          console.error('Supabase storage getItem error:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          console.error('Supabase storage setItem error:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error('Supabase storage removeItem error:', error);
        }
      },
    },
  },
})

// Admin client for server-side operations (use with caution)
export const supabaseAdmin = supabaseConfig.serviceRoleKey
  ? createClient(supabaseUrl, supabaseConfig.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null