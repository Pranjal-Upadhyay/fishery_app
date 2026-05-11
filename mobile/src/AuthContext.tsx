import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from './services/authService';

export const AuthContext = createContext({
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
});

// ── DEV MODE: set to true to skip login during UI review ──────────────────
const DEV_SKIP_AUTH = false;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(DEV_SKIP_AUTH);
    const [loading, setLoading] = useState(!DEV_SKIP_AUTH);

    useEffect(() => {
        if (DEV_SKIP_AUTH) return;
        authService.isAuthenticated().then((auth) => {
            setIsAuthenticated(auth);
            setLoading(false);
        });
    }, []);

    const login = () => setIsAuthenticated(true);

    const logout = async () => {
        await authService.logout();
        setIsAuthenticated(false);
    };

    if (loading) return null; // Or a splash screen

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
