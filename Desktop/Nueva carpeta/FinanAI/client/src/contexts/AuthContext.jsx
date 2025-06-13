import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from '../auth/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const API_URL = 'https://example.com/api'; // Reemplazar con la URL de la API

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Intentar obtener el token de refresco
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No hay token de refresco disponible');
        }

        // Verificar la sesión
        const response = await fetch(`${API_URL}/auth/verify`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsAuthenticated(true);
          setAuthError('');
        } else if (response.status === 401) {
          // Intentar refrescar el token
          try {
            const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData.token) {
                localStorage.setItem('authToken', refreshData.token);
                // Intentar verificar la sesión nuevamente
                const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Authorization': `Bearer ${refreshData.token}`
                  }
                });
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json();
                  setUser(verifyData.user);
                  setIsAuthenticated(true);
                  setAuthError('');
                } else {
                  throw new Error('No se pudo verificar la sesión después del refresco');
                }
              }
            } else {
              throw new Error('No se pudo refrescar el token');
            }
          } catch (refreshError) {
            console.error('Error al refrescar el token:', refreshError);
            throw refreshError;
          }
        } else {
          throw new Error('Error al verificar la sesión');
        }
      } catch (error) {
        console.error('Error en la verificación de sesión:', error);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        // Limpiar tokens locales
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    };

    checkSession();

    // Verificar sesión cada 3 minutos
    const intervalId = setInterval(checkSession, 3 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      // Limpiar tokens locales al desmontar
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    };
  }, [API_URL]);

  const login = (userData) => {
    console.log('Login ejecutado con:', userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      setIsAuthenticated(false);
      // Redirigir al login se maneja en el componente que llama a logout
    } catch (error) {
      console.error('Error durante el logout:', error);
      // Aún así, limpiamos el estado local
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth // Exportamos checkAuth para poder usarlo en otros componentes
  };

  console.log('Estado actual de autenticación:', { isAuthenticated, user });

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

// Hook personalizado para usar la autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 