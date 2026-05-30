'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const handleAuth = (res: AuthResponse) => {
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password }, false);
    return handleAuth(res);
  };

  const register = async (input: { name: string; email: string; password: string; phone?: string }) => {
    const res = await api.post<AuthResponse>('/auth/register', input, false);
    return handleAuth(res);
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await api.post<AuthResponse>('/auth/google', { idToken }, false);
    return handleAuth(res);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
