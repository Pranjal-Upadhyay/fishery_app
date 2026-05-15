import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, type AuthUser } from './services/authService';
import { processPendingProfileSync, startProfileSyncListener, stopProfileSyncListener } from './services/profileSyncService';

export type AuthRole = 'farmer' | 'doctor';

interface AuthContextValue {
  isAuthenticated: boolean;
  authRole: AuthRole | null;
  currentUser: AuthUser | null;
  refreshSession: () => Promise<void>;
  establishSession: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  authRole: null,
  currentUser: null,
  refreshSession: async () => {},
  establishSession: () => {},
  logout: async () => {},
});

function mapRole(user: AuthUser | null): AuthRole | null {
  if (!user) return null;
  return user.role === 'DOCTOR' ? 'doctor' : 'farmer';
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<AuthRole | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const authenticated = await authService.isAuthenticated();
    if (!authenticated) {
      setIsAuthenticated(false);
      setAuthRole(null);
      setCurrentUser(null);
      return;
    }

    const user = await authService.getCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(Boolean(user));
    setAuthRole(mapRole(user));
  };

  const establishSession = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setAuthRole(mapRole(user));
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshSession();
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      stopProfileSyncListener();
      return;
    }

    startProfileSyncListener();
    void processPendingProfileSync();

    return () => {
      stopProfileSyncListener();
    };
  }, [currentUser?.id]);

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setAuthRole(null);
    setCurrentUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, authRole, currentUser, refreshSession, establishSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
