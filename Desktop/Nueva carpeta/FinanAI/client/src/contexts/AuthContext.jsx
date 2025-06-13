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

  // Función para realizar peticiones autenticadas con manejo de errores
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
        mode: 'cors'
      });

      // Si el token expiró, intentar refrescarlo
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
              credentials: 'include',
              mode: 'cors'
            });

            if (refreshResponse.ok) {
              const { accessToken: newAccessToken } = await refreshResponse.json();
              localStorage.setItem('accessToken', newAccessToken);
              // Reintentar la petición original con el nuevo token
              headers.Authorization = `Bearer ${newAccessToken}`;
              const retryResponse = await fetch(`${API_URL}${url}`, {
                ...options,
                headers,
                credentials: 'include',
                mode: 'cors'
              });
              return retryResponse;
            }
          } catch (error) {
            console.error('Error refreshing token:', error);
            clearAuth();
            window.location.href = '/login';
            throw error;
          }
        } else {
          clearAuth();
          window.location.href = '/login';
          throw new Error('No refresh token available');
        }
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }, [API_URL, clearAuth]);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return false;

      const response = await fetchWithAuth('/auth/verify', {
        method: 'GET'
      });

      if (response && response.ok) {
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
  }, [fetchWithAuth]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetchWithAuth('/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
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
  }, [fetchWithAuth, clearAuth]);

  // Login - Maneja tanto el login con credenciales como la autenticación directa
  const login = useCallback(async (emailOrUserData, passwordOrTokens) => {
    // Si el segundo parámetro es un objeto, asumimos que es un login directo con tokens
    if (typeof emailOrUserData === 'object' && emailOrUserData !== null) {
      const { user: userData, tokens } = emailOrUserData;
      if (tokens) {
        localStorage.setItem('accessToken', tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
      }
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError('');
      return { success: true };
    }

    // Si no, es un login tradicional con email/contraseña
    try {
      const response = await fetchWithAuth('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailOrUserData, password: passwordOrTokens }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error en el inicio de sesión');
      }

      const data = await response.json();
      
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        setUser(data.user);
        setIsAuthenticated(true);
        setAuthError('');
        return { success: true };
      } else {
        throw new Error('No se recibió el token de acceso');
      }
    } catch (error) {
      console.error('Error en login:', error);
      const errorMessage = error.message || 'Error de conexión';
      setAuthError(errorMessage);
      clearAuth();
      return { success: false, error: errorMessage };
    }
  }, [fetchWithAuth, clearAuth]);

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

  // La función login consolidada maneja ambos casos de uso

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