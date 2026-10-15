import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole, LoginPayload, login as apiLogin, getCurrentUser } from '../api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aes_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('aes_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // WHY: On application mount, verifies if a stored JWT exists and re-validates profile via GET /api/v1/auth/me
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aes_token');
      if (storedToken) {
        try {
          const profile = await getCurrentUser();
          setUser(profile);
          localStorage.setItem('aes_user', JSON.stringify(profile));
        } catch (err) {
          console.warn('[AuthContext] Token expired or invalid, resetting session.');
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // WHY: Persists issued JWT access token and user role profile to localStorage to keep user logged in on page reloads
  const login = async (payload: LoginPayload) => {
    const res = await apiLogin(payload);
    setToken(res.access_token);
    const profile: UserProfile = {
      id: res.user_id,
      email: res.email,
      role: res.role,
    };
    setUser(profile);
    localStorage.setItem('aes_token', res.access_token);
    localStorage.setItem('aes_user', JSON.stringify(profile));
  };

  // WHY: Purges credentials from React state and browser storage on logout to prevent unauthorized access
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aes_token');
    localStorage.removeItem('aes_user');
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasRole,
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
