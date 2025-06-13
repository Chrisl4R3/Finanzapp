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

  // Verificar el estado de autenticación
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

      if (response && response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser({
            id: data.user.id,
            cedula: data.user.cedula,
            name: data.user.name,
            email: data.user.email
          });
          setIsAuthenticated(true);
          setAuthError('');
          return true;
        }
      }
      
      // Si la verificación falla, limpiar el estado
      clearAuth();
      return false;
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      clearAuth();
      return false;
    }
  }, [API_URL, clearAuth]);

  // Refrescar el token de acceso
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No hay token de refresco disponible');
      }

      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          
          // Actualizar el token de refresco si se proporciona uno nuevo
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          
          // Actualizar el estado del usuario si se proporciona
          if (data.user) {
            setUser({
              id: data.user.id,
              cedula: data.user.cedula,
              name: data.user.name,
              email: data.user.email
            });
            setIsAuthenticated(true);
          }
          
          return data.accessToken;
        }
      }
      
      // Si llegamos aquí, algo salió mal
      throw new Error('No se pudo refrescar el token');
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      clearAuth();
      throw error;
    }
  }, [API_URL, clearAuth]);

  // Login - Maneja el inicio de sesión con cédula y contraseña
  const login = useCallback(async (cedula, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cedula, password }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error en el inicio de sesión');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('accessToken', data.token);
        
        // Actualizar el estado del usuario con los datos recibidos
        if (data.user) {
          setUser({
            id: data.user.id,
            cedula: data.user.cedula,
            name: data.user.name,
            email: data.user.email
          });
          setIsAuthenticated(true);
          setAuthError('');
          return { success: true };
        }
      }
      
      // Si llegamos aquí, algo salió mal
      throw new Error('Respuesta inesperada del servidor');
    } catch (error) {
      console.error('Error en login:', error);
      const errorMessage = error.message || 'Error de conexión';
      setAuthError(errorMessage);
      clearAuth();
      return { success: false, error: errorMessage };
    }
  }, [API_URL, clearAuth]);

  // Inicializar el estado de autenticación al cargar el componente
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Verificar si hay un token de acceso
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          clearAuth();
          return;
        }

        // Intentar verificar el token actual
        const isVerified = await checkAuth();
        
        // Si la verificación falla, intentar refrescar el token
        if (!isVerified) {
          try {
            const newToken = await refreshToken();
            if (newToken) {
              await checkAuth();
            } else {
              clearAuth();
            }
          } catch (error) {
            console.error('Error al refrescar la sesión:', error);
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Error en la inicialización de autenticación:', error);
        clearAuth();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Configurar verificación periódica (cada 5 minutos)
    const intervalId = setInterval(() => {
      checkAuth().catch(error => {
        console.error('Error en verificación periódica de autenticación:', error);
      });
    }, 5 * 60 * 1000);

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