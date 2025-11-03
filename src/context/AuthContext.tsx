import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Profile } from '../types';
import { load, save } from '../services/storage';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { ProfileService } from '../services/profileService';
import { SecureAuth, SecurityService } from '../services/securityService';

type AuthContextType = {
   user: User | null;
   login: (email: string, password: string) => Promise<boolean>;
   register: (name: string, email: string, password: string, phone: string, roleRequest: string) => Promise<boolean>;
   updateProfile: (updates: Partial<User>) => Promise<boolean>;
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
        console.log('🔄 AuthContext: Loading initial session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔄 AuthContext: Session loaded:', !!session);

        if (session?.user) {
          console.log('🔄 AuthContext: User found in session, fetching profile...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('❌ AuthContext: Profile fetch error:', profileError);
          }

          if (profile) {
            console.log('✅ AuthContext: Profile loaded successfully');
            const user: User = {
              id: profile.id,
              name: profile.name,
              email: session.user.email!,
              phone: profile.phone,
              role: profile.role,
              role_status: profile.role_status,
              province_code: profile.province_code,
              province_name: profile.province_name,
              city_code: profile.city_code,
              city_name: profile.city_name,
              barangay: profile.barangay,
              measurements: profile.measurements,
              profileComplete: profile.profile_complete,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
              is_admin: profile.is_admin || false,
            };
            setUser(user);
            console.log('✅ AuthContext: User state set:', user.id);
          } else {
            console.log('⚠️ AuthContext: No profile found for user');
          }
        } else {
          console.log('🔄 AuthContext: No session found, checking old storage...');
          // Fallback to old storage for migration
          const oldUser = await load('@user', null);
          if (oldUser) {
            setUser(oldUser);
            console.log('✅ AuthContext: Old user loaded from storage');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Error loading user:', error);
      } finally {
        setIsLoading(false);
        console.log('✅ AuthContext: Loading complete');
      }
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state change:', event, !!session);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 AuthContext: User signed in, fetching profile...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('❌ AuthContext: Profile fetch error on sign in:', profileError);
          }

          if (profile) {
            console.log('✅ AuthContext: Profile loaded on sign in');
            const user: User = {
              id: profile.id,
              name: profile.name,
              email: session.user.email!,
              phone: profile.phone,
              role: profile.role,
              role_status: profile.role_status,
              province_code: profile.province_code,
              province_name: profile.province_name,
              city_code: profile.city_code,
              city_name: profile.city_name,
              barangay: profile.barangay,
              measurements: profile.measurements,
              profileComplete: profile.profile_complete,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
              is_admin: profile.is_admin || false,
            };
            setUser(user);
            console.log('✅ AuthContext: User state updated on sign in:', user.id);
          } else {
            console.log('⚠️ AuthContext: No profile found on sign in');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔄 AuthContext: User signed out');
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔵 Starting secure login attempt for email:', email);

      // Use secure authentication with rate limiting and account lockout
      const result = await SecureAuth.signInWithPassword(email, password);

      console.log('✅ Secure login successful');
      // User will be set by the auth state change listener
      return true;
    } catch (error: any) {
      console.error('❌ Secure login failed with error:', error);

      // Handle specific security-related errors
      if (error.message?.includes('temporarily locked')) {
        Alert.alert('Account Locked', error.message);
      } else if (error.message?.includes('rate limited')) {
        Alert.alert('Too Many Attempts', 'Please wait before trying again.');
      } else {
        Alert.alert('Login Failed', error.message || 'Please check your credentials.');
      }
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string, roleRequest: string) => {
    try {
      console.log('🔵 Starting secure registration...');

      // Use secure registration with password validation
      const result = await SecureAuth.signUp(email, password, {
        name,
        phone,
        role: roleRequest,
      });

      console.log('✅ Secure registration successful, user ID:', result.user?.id);

      // Wait and poll for the database trigger to create the profile
      if (result.user) {
        console.log('⏳ Waiting for profile creation...');
        const userId = result.user.id;

        let profile: any = null;
        const maxAttempts = 10;
        const delayMs = 500;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          console.log(`🔍 Fetching profile (attempt ${attempt}/${maxAttempts}) for user:`, userId);
          const { data: fetched, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (fetched) {
            profile = fetched;
            break;
          }

          if (fetchError) {
            // PGRST116 = No rows found; keep polling. Other errors should surface.
            if ((fetchError as any).code && (fetchError as any).code !== 'PGRST116') {
              console.error('❌ Profile fetch error:', fetchError);
              throw fetchError;
            }
          }

          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (!profile) {
          throw new Error('Profile was not created by trigger. Please ensure migrations were applied.');
        }

        console.log('✅ Profile found:', profile);
        const newUser: User = {
          id: profile.id,
          name: profile.name,
          email: result.user.email!,
          phone: profile.phone,
          role: profile.role,
          role_status: profile.role_status,
          province_code: profile.province_code,
          province_name: profile.province_name,
          city_code: profile.city_code,
          city_name: profile.city_name,
          barangay: profile.barangay,
          measurements: profile.measurements,
          profileComplete: profile.profile_complete,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        console.log('🎯 Setting user state:', newUser);
        setUser(newUser);
        console.log('✅ User state set successfully');
      }

      return true;
    } catch (error: any) {
      console.error('❌ Secure registration error:', error);

      // Handle password policy errors specifically
      if (error.message?.includes('Password validation failed')) {
        Alert.alert('Password Requirements', error.message);
      } else {
        Alert.alert('Registration Failed', error.message || 'Please try again.');
      }
      return false;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return false;

    try {
      const result = await ProfileService.updateProfile(updates);
      if (!result.success) {
        Alert.alert('Update Failed', result.error || 'Please try again.');
        return false;
      }

      // Update local state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      return true;
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Please try again.');
      return false;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setUser(null);
  };

  const proceedAsGuest = async () => {
    const guest: User = {
      id: 'guest',
      name: 'Guest',
      email: 'guest@local',
      phone: undefined,
      role: 'customer',
      role_status: 'approved',
      profileComplete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(guest);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, proceedAsGuest, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
