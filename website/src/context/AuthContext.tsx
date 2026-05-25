'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  referralCode: string;
  totalPoints: number;
  avatarUrl?: string;
  walletAddress?: string;
  isActive: boolean;
  createdAt: string;
  nodes?: any[];
  _count?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (googleId: string, email: string, name?: string) => Promise<void>;
  walletLogin: (walletAddress: string, signature: string, message: string) => Promise<void>;
  signup: (email: string, username: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  linkWallet: (walletAddress: string, signature: string, message: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('orbitlink_token');
    if (savedToken) {
      setToken(savedToken);
      loadProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadProfile = async (authToken?: string) => {
    try {
      const res = await api.getProfile();
      setUser(res.data);
    } catch {
      localStorage.removeItem('orbitlink_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    const { user: userData, token: authToken } = res.data;
    localStorage.setItem('orbitlink_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const signup = async (email: string, username: string, password: string, referralCode?: string) => {
    const res = await api.signup({ email, username, password, referralCode });
    const { user: userData, token: authToken } = res.data;
    localStorage.setItem('orbitlink_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const googleLogin = async (googleId: string, email: string, name?: string) => {
    const res = await api.googleLogin({ googleId, email, name });
    const { user: userData, token: authToken } = res.data;
    localStorage.setItem('orbitlink_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const walletLogin = async (walletAddress: string, signature: string, message: string) => {
    const res = await api.walletLogin({ walletAddress, signature, message });
    const { user: userData, token: authToken } = res.data;
    localStorage.setItem('orbitlink_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const linkWallet = async (walletAddress: string, signature: string, message: string) => {
    const res = await api.linkWallet({ walletAddress, signature, message });
    setUser(res.data);
  };

  const logout = () => {
    localStorage.removeItem('orbitlink_token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAuthenticated: !!user,
      login, googleLogin, walletLogin, signup, logout, refreshProfile, linkWallet,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
