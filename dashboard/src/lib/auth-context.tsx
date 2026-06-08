'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStore, onSessionEnd, ApiError } from './api';
import type { AdminUser, ApiEnvelope, LoginResponse } from './types';

interface AuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Hydrate admin from a stored token (page refresh path). */
  const hydrate = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<ApiEnvelope<AdminUser>>('/api/v1/admin/me');
      setAdmin(res.data);
    } catch {
      // Token bad or expired; the api layer already cleared it.
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
    const off = onSessionEnd(() => {
      setAdmin(null);
      router.replace('/login');
    });
    return off;
  }, [hydrate, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<ApiEnvelope<LoginResponse>>(
      '/api/v1/admin/login',
      { email, password },
      { skipAuth: true }
    );
    if (!res.success) throw new ApiError(res.error ?? 'Login failed', 401);
    tokenStore.set(res.data.token);
    setAdmin(res.data.admin);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
