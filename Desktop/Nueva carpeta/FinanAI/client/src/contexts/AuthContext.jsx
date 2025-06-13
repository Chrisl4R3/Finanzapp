import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as authLogout } from '../auth/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Clear auth state and tokens
  const clearAuth = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return false;

      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        setAuthError('');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying auth:', error);
      return false;
    }
  }, [API_URL]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        return data.accessToken;
      }
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Error refreshing token:', error);
      clearAuth();
      throw error;
    }
  }, [API_URL, clearAuth]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        
        // If no access token, clear auth state
        if (!accessToken) {
          clearAuth();
          return;
        }

        // Try to verify with current token
        const isVerified = await checkAuth();
        
        // If not verified, try to refresh
        if (!isVerified) {
          try {
            await refreshToken();
            await checkAuth();
          } catch (error) {
            console.error('Failed to refresh session:', error);
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up periodic check (every 5 minutes)
    const intervalId = setInterval(checkAuth, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkAuth, refreshToken, clearAuth]);

  const login = useCallback((userData, tokens) => {
    if (tokens) {
      localStorage.setItem('accessToken', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
    }
    setUser(userData);
    setIsAuthenticated(true);
    setAuthError('');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearAuth();
      // Redirect to login will be handled by ProtectedRoute
    }
  }, [clearAuth]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    checkAuth,
    refreshToken
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-color">
        <div className="text-xl text-text-secondary">Cargando...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 