'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from './supabase';
import { User, UserRole } from './auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDashboardPath = (role: UserRole) => {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'dean': return '/dean/dashboard';
    case 'chair': return '/chair/dashboard';
    case 'faculty': return '/faculty/dashboard';
    default: return '/';
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          // Trust local session immediately to avoid logout on refresh
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          // Perform a silent background refresh; do NOT logout on failure
          (async () => {
            try {
              const { data, error } = await supabase
                .from('user')
                .select('id, first_name, last_name, email, role, position')
                .eq('id', parsedUser.id)
                .single();
                
              if (!error && data) {
                const updatedUser: User = {
                  id: data.id.toString(),
                  email: data.email,
                  name: `${data.first_name} ${data.last_name}`.trim() || data.email,
                  role: data.role as UserRole,
                  position: data.position || '',
                };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }
            } catch (err) {
              console.warn('Silent refresh failed:', err);
            }
          })();
        } else {
          // No stored session
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Failed to initialize auth", error);
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      }
      setHasChecked(true);
    };

    initializeAuth();
    // Remove Supabase Auth listener per request
  }, []);

  useEffect(() => {
    if (!hasChecked || !mounted) return;

    const isLoginPage = window.location.pathname === '/login';
    const isRegisterPage = window.location.pathname === '/register';
    const isPublicPage = isLoginPage || isRegisterPage || window.location.pathname === '/';

    // If we have a user, handle dashboard redirection if they are on login
    if (isAuthenticated && user) {
      if (isLoginPage || isRegisterPage) {
        router.push(getDashboardPath(user.role));
      }
      setIsReady(true);
    } 
    // If not authenticated and not on a public page, redirect to login
    else if (!isPublicPage) {
      router.push('/login');
      // We don't set isReady to true here to prevent the flash of protected content
    } 
    // If not authenticated but on a public page, we are ready to show it
    else {
      setIsReady(true);
    }
  }, [user, isAuthenticated, hasChecked, mounted, router]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const { data: legacyData, error: legacyError } = await supabase.rpc('check_password', {
      user_email: email,
      user_password: password,
    });
    if (legacyError) {
      return { success: false, message: `Login error: ${legacyError.message || 'Unknown error'}` };
    }
    if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
      const dbUser = legacyData[0];
      const loggedInUser: User = {
        id: dbUser.id.toString(),
        email: dbUser.email,
        name: `${dbUser.first_name} ${dbUser.last_name}`.trim() || dbUser.email,
        role: dbUser.role as UserRole,
        position: dbUser.position || '',
      };
      setUser(loggedInUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      return { success: true, message: 'Login successful' };
    }
    return { success: false, message: 'Invalid email or password.' };
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, first_name, last_name, email, role, position')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        const updatedUser: User = {
          id: data.id.toString(),
          email: data.email,
          name: `${data.first_name} ${data.last_name}`.trim() || data.email,
          role: data.role as UserRole,
          position: data.position || '',
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      // Keep current session on refresh failure
      console.error('Failed to refresh user data:', error);
    }
  };

  // Auto-logout if the user record is deleted in DB while session is active
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('auth_user_deletion_watch')
      .on(
        'postgres_changes' as any,
        { event: 'delete', schema: 'public', table: 'user' },
        (payload: any) => {
          const deletedId = payload?.old?.id?.toString?.() ?? payload?.old?.id;
          if (deletedId && deletedId === user.id) {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('user');
            router.push('/login');
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, router]);

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
