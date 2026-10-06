import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosClient } from '../api/axiosClient';

export type UserRole = 'ADMIN' | 'STORE_KEEPER' | 'SALES_FINANCE' | 'LAB_TECHNICIAN';

export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isStoreKeeper: boolean;
    isSalesFinance: boolean;
    isLabTech: boolean;
    canManageInventory: boolean; // Add/edit products, stock adjustments (Admin, Store Keeper)
    canAccessPOS: boolean;       // POS billing (Admin, Sales & Finance)
    canAccessPanels: boolean;    // Panel Mfg. (Admin, Sales & Finance)
    canAccessRepairs: boolean;   // Drive repairs (Admin, Lab Tech)
    canAccessOrders: boolean;    // Invoices & Sales (Admin, Sales & Finance)
    canAccessLowStock: boolean;  // Low stock alerts (Admin, Store Keeper)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const role = user?.role;
    const isAdmin = role === 'ADMIN';
    const isStoreKeeper = role === 'STORE_KEEPER';
    const isSalesFinance = role === 'SALES_FINANCE';
    const isLabTech = role === 'LAB_TECHNICIAN';

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isAuthenticated: !!token && !!user,
                isAdmin,
                isStoreKeeper,
                isSalesFinance,
                isLabTech,
                canManageInventory: isAdmin || isStoreKeeper,
                canAccessPOS: isAdmin || isSalesFinance,
                canAccessPanels: isAdmin || isSalesFinance,
                canAccessRepairs: isAdmin || isLabTech,
                canAccessOrders: isAdmin || isSalesFinance,
                canAccessLowStock: isAdmin || isStoreKeeper,
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