import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Profile } from '../types';
import { load, save } from '../services/storage';
import { supabase } from '../services/supabase';
import { ProfileService } from '../services/profileService';
import { SecureAuth, SecurityService } from '../services/securityService';
import { useToast } from './ToastContext';

type AuthContextType = {
   user: User | null;
   login: (email: string, password: string) => Promise<boolean>;
   register: (name: string, email: string, password: string, phone: string, roleRequest: string, addressData?: { province?: any; city?: any; barangay?: string }) => Promise<boolean>;
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
  const { showError } = useToast();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        console.log('🔄 AuthContext: Loading initial session...');

        // First, try to get session from Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ AuthContext: Session error:', sessionError);
        }

        console.log('🔄 AuthContext: Session loaded:', !!session);

        if (session?.user && mounted) {
          console.log('🔄 AuthContext: User found in session, fetching profile...');

          // Add retry logic for profile fetching
          let profile = null;
          const maxRetries = 3;
          const retryDelay = 1000;

          for (let attempt = 1; attempt <= maxRetries && mounted; attempt++) {
            try {
              const { data: fetchedProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profileError) {
                console.error(`❌ AuthContext: Profile fetch error (attempt ${attempt}):`, profileError);

                if (attempt < maxRetries) {
                  console.log(`⏳ Retrying profile fetch in ${retryDelay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  continue;
                }
              } else {
                profile = fetchedProfile;
                console.log('✅ AuthContext: Profile loaded successfully');
                break;
              }
            } catch (error) {
              console.error(`❌ AuthContext: Profile fetch exception (attempt ${attempt}):`, error);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }

          if (profile && mounted) {
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
              avatar_url: profile.avatar_url,
            };
            setUser(user);
            console.log('✅ AuthContext: User state set:', user.id);

            // Store user data in AsyncStorage as backup
            await save('@user', user);
            await save('@lastLoginTime', new Date().toISOString());
          } else if (mounted) {
            console.log('⚠️ AuthContext: No profile found for user after retries');
            // Clear any stale session if profile doesn't exist
            await supabase.auth.signOut();
          }
        } else if (mounted) {
          console.log('🔄 AuthContext: No session found, checking AsyncStorage backup...');

          // Check AsyncStorage for persisted user data
          const storedUser = await load('@user', null);
          const lastLoginTime = await load('@lastLoginTime', null);

          if (storedUser && lastLoginTime) {
            const loginTime = new Date(lastLoginTime);
            const now = new Date();
            const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);

            // Only restore if login was within last 24 hours
            if (hoursSinceLogin < 24) {
              console.log('✅ AuthContext: Restoring user from AsyncStorage');
              setUser(storedUser);

              // Try to refresh the session in background
              try {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                if (!refreshedSession) {
                  console.log('⚠️ AuthContext: Could not refresh session, keeping stored user');
                }
              } catch (error) {
                console.error('❌ AuthContext: Session refresh failed:', error);
              }
            } else {
              console.log('🔄 AuthContext: Stored login too old, clearing...');
              await save('@user', null);
              await save('@lastLoginTime', null);
            }
          } else {
            console.log('🔄 AuthContext: No stored user data found');
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Error loading user:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log('✅ AuthContext: Loading complete');
        }
      }
    })();

    // Listen for auth changes with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: Auth state change:', event, !!session, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 AuthContext: User signed in, fetching profile...');

          // Add retry logic for profile fetching on sign in
          let profile = null;
          const maxRetries = 3;
          const retryDelay = 1000;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const { data: fetchedProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profileError) {
                console.error(`❌ AuthContext: Profile fetch error on sign in (attempt ${attempt}):`, profileError);

                if (attempt < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  continue;
                }
              } else {
                profile = fetchedProfile;
                console.log('✅ AuthContext: Profile loaded on sign in');
                break;
              }
            } catch (error) {
              console.error(`❌ AuthContext: Profile fetch exception on sign in (attempt ${attempt}):`, error);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }

          if (profile) {
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
              avatar_url: profile.avatar_url,
            };
            setUser(user);
            console.log('✅ AuthContext: User state updated on sign in:', user.id);

            // Store user data in AsyncStorage
            await save('@user', user);
            await save('@lastLoginTime', new Date().toISOString());
          } else {
            console.log('⚠️ AuthContext: No profile found on sign in');
            // Sign out if no profile exists
            await supabase.auth.signOut();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔄 AuthContext: User signed out');
          setUser(null);

          // Clear stored user data
          await save('@user', null);
          await save('@lastLoginTime', null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 AuthContext: Token refreshed successfully');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
        showError('Account Locked: ' + error.message);
      } else if (error.message?.includes('rate limited')) {
        showError('Too Many Attempts', 5000, {
          label: 'Try Again',
          onPress: () => login(email, password)
        });
      } else {
        showError(error.message || 'Please check your credentials.');
      }
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string, roleRequest: string, addressData?: { province?: any; city?: any; barangay?: string }) => {
    try {
      console.log('🔵 Starting secure registration...');

      // Prepare metadata with address data if provided
      const metadata: any = {
        name,
        phone,
        role: roleRequest,
      };

      if (addressData) {
        if (addressData.province) {
          metadata.province_code = addressData.province.code;
          metadata.province_name = addressData.province.name;
        }
        if (addressData.city) {
          metadata.city_code = addressData.city.code;
          metadata.city_name = addressData.city.name;
        }
        if (addressData.barangay) {
          metadata.barangay = addressData.barangay;
        }
        metadata.profile_complete = true;
      }

      // Use secure registration with password validation
      const result = await SecureAuth.signUp(email, password, metadata);

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
            console.log('✅ Profile found on attempt', attempt, ':', profile);
            break;
          }

          if (fetchError) {
            console.log(`⚠️ Profile fetch error on attempt ${attempt}:`, fetchError);
            // PGRST116 = No rows found; keep polling. Other errors should surface.
            if ((fetchError as any).code && (fetchError as any).code !== 'PGRST116') {
              console.error('❌ Profile fetch error (non-404):', fetchError);
              // Log detailed error information
              console.error('❌ Error details:', {
                code: (fetchError as any).code,
                message: fetchError.message,
                details: fetchError.details,
                hint: fetchError.hint
              });
              throw new Error(`Database error saving new user: ${fetchError.message || 'Unknown database error'}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (!profile) {
          console.error('❌ Profile creation timeout after', maxAttempts, 'attempts');
          throw new Error('Secure registration error: [AuthApiError: Database error saving new user]');
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
          avatar_url: profile.avatar_url,
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
        showError('Password Requirements: ' + error.message);
      } else if (error.message?.includes('Database error saving new user')) {
        showError('Registration failed: Database error. Please try again.');
      } else if (error.message?.includes('Secure registration error')) {
        showError('Registration failed: Unable to create user profile. Please try again.');
      } else {
        showError(error.message || 'Please try again.');
      }
      return false;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return false;

    try {
      const result = await ProfileService.updateProfile(updates);
      if (!result.success) {
        showError(result.error || 'Please try again.');
        return false;
      }

      // Update local state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      return true;
    } catch (error: any) {
      showError(error.message || 'Please try again.');
      return false;
    }
  };

  const logout = async () => {
    console.log('🔄 AuthContext: Logout initiated');
    try {
      console.log('🔄 AuthContext: Calling supabase.auth.signOut()...');

      // Create a promise with timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SignOut timeout')), 5000)
      );

      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
      console.log('🔄 AuthContext: signOut() returned, error:', error);

      if (error) {
        console.error('❌ AuthContext: Logout error:', error);
        // Continue with local logout even if Supabase fails
      } else {
        console.log('✅ AuthContext: Supabase signOut successful');
      }
    } catch (error) {
      console.error('❌ AuthContext: Exception during signOut:', error);
      // Continue with local logout even if Supabase fails
    }

    console.log('🔄 AuthContext: Setting user to null');
    setUser(null);

    // Clear stored user data
    await save('@user', null);
    await save('@lastLoginTime', null);

    console.log('✅ AuthContext: User state set to null and storage cleared');
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
