import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types/database';
import { INITIAL_PROFILES } from '../lib/demoData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'stationery_auth_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check saved session
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
              setIsLoading(false);
              return;
            }
          }
        }

        // Check local persisted session
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          // Default to Admin initial session for immediate ease of use
          const defaultAdmin = INITIAL_PROFILES[0];
          setUser(defaultAdmin);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultAdmin));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured() && password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profError || !profile) {
            throw new Error('User profile not found in database.');
          }

          setUser(profile as Profile);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
          return;
        }
      }

      // Local / Demo authentication logic
      const matched = INITIAL_PROFILES.find(p => p.email.toLowerCase() === email.trim().toLowerCase());
      if (matched) {
        setUser(matched);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
      } else {
        // Fallback create custom logged in user
        const customUser: Profile = {
          id: 'user-' + Date.now(),
          shop_id: 'shop-001',
          email: email.trim(),
          full_name: email.split('@')[0],
          role: email.toLowerCase().includes('staff') ? 'staff' : 'admin',
          created_at: new Date().toISOString(),
        };
        setUser(customUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = (targetRole: UserRole) => {
    const profile = INITIAL_PROFILES.find(p => p.role === targetRole) || INITIAL_PROFILES[0];
    setUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    }
    // Simulation succeeded
    return Promise.resolve();
  };

  const role: UserRole = user?.role || 'staff';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isLoading,
        login,
        logout,
        switchDemoRole,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

