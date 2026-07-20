import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import API from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('resto_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('resto_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('resto_user', JSON.stringify(res.data.user));
        } catch (error) {
          console.error('Session expired or invalid token');
          logout();
        }
      }
      setIsLoading(false);
    };
    verifyUser();
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await API.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem('resto_token', newToken);
    localStorage.setItem('resto_user', JSON.stringify(userData));

    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('resto_token');
    localStorage.removeItem('resto_user');
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
