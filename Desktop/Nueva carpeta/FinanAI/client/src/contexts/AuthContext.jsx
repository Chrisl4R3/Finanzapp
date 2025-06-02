import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, logout as authLogout } from '../auth/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error al verificar la autenticación:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar la sesión al cargar la aplicación
  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar la sesión periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkAuth();
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [isAuthenticated]);

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