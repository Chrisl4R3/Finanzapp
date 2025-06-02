import React, { createContext, useState, useContext, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar el token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token');
      console.log('Verificando token:', token);
      
      if (token) {
        try {
          // Verificar el token con el backend
          const response = await fetch('http://localhost:3000/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Token válido, usuario:', data.user);
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            console.log('Token inválido');
            sessionStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error al verificar la autenticación:', error);
          sessionStorage.removeItem('token');
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log('No hay token');
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    console.log('Login ejecutado con:', userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log('Logout ejecutado');
    sessionStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
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