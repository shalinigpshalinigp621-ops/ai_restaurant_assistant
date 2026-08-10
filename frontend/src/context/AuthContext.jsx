/**
 * AuthContext — React context for authentication state.
 * Provides login, logout, register functions and current user state
 * throughout the entire application.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Validate token by fetching current user
          const { data } = await authAPI.getMe();
          setUser(data);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(data));
        } catch {
          // Token invalid — clear storage
          clearStorage();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });

    // Persist tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Update state synchronously before returning so ProtectedRoute
    // sees the correct state when the caller navigates
    setUser(data.user);
    setIsAuthenticated(true);

    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore server errors on logout
    } finally {
      clearStorage();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updatedUser = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  function clearStorage() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context.
 * Must be used within AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
