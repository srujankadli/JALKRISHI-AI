import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type UserProfile } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<boolean>;
  quickLogin: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage for active session or initialize default guest profile
    const storedUser = authService.getStoredUser();
    const storedToken = authService.getStoredToken();

    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    } else {
      // Default initial session as Progressive Farmer for farmer-first experience
      const defaultUser = authService.getMockUserProfile('farmer@jalkrishi.in');
      setUser(defaultUser);
      setToken('jalkrishi-farmer-session-token');
      authService.setStoredSession(defaultUser, 'jalkrishi-farmer-session-token');
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: string = 'hydrogeologist'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password, role);
      if (res && res.user) {
        setUser(res.user);
        setToken(res.access_token);
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      console.error('Login error', e);
    }
    setIsLoading(false);
    return false;
  };

  const quickLogin = async (email: string): Promise<boolean> => {
    return login(email, 'jalkrishi2026', 'hydrogeologist');
  };

  const logout = () => {
    authService.clearStoredSession();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
