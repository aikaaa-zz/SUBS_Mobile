import React, { createContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

type UserSession = {
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountType: string | null;
  businessId: string | null;
  businessName: string | null;
  token: string | null;
  user: any;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: UserSession | null;
  login: (userData: any, token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  session: null,
  login: async () => false,
  logout: async () => {},
  refreshSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const hasSession = await storage.hasActiveSession();
      if (hasSession) {
        const isPersonal = await storage.isPersonalAccount();
        if (!isPersonal) {
          await storage.clearSession();
          setIsAuthenticated(false);
          setSession(null);
        } else {
          const currentSession = await storage.getCurrentSession();
          setSession(currentSession);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
        setSession(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setSession(null);
    } finally {
      setIsLoading(false);
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (userData: any, token: string): Promise<boolean> => {
    if (userData.accountType !== 'personal') {
      return false;
    }
    await storage.setSession(userData, token);
    const currentSession = await storage.getCurrentSession();
    setSession(currentSession);
    setIsAuthenticated(true);
    return true;
  };

  const logout = async () => {
    await storage.clearSession();
    setSession(null);
    setIsAuthenticated(false);
  };

  const refreshSession = async () => {
    const currentSession = await storage.getCurrentSession();
    setSession(currentSession);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, session, login, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};
