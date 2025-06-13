import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { API_CONFIG, AUTH_CONFIG } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // Obtener la URL base de la API desde la configuración
  const API_BASE_URL = API_CONFIG.BASE_URL;
  const { AUTH } = API_CONFIG.ENDPOINTS;

  // Limpiar el estado de autenticación y los tokens
  const clearAuth = useCallback(() => {
    // Eliminar tokens del localStorage
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    
    // Resetear el estado
    setUser(null);
    setIsAuthenticated(false);
    setAuthError('');
    
    // Opcional: Redirigir al login si no estamos ya en esa ruta
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  // Función para realizar peticiones autenticadas con manejo de errores
  const fetchWithAuth = useCallback(async (endpoint, options = {}) => {
    const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors'
    };

    try {
      const response = await fetch(url, config);

      // Si el token expiró, intentar refrescarlo
      if (response.status === 401) {
        const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}${AUTH.REFRESH_TOKEN}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
              },
              credentials: 'include',
              mode: 'cors',
              body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
              const { accessToken: newAccessToken } = await refreshResponse.json();
              localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, newAccessToken);
              
              // Reintentar la petición original con el nuevo token
              headers.Authorization = `Bearer ${newAccessToken}`;
              const retryResponse = await fetch(url, {
                ...config,
                headers: { ...config.headers, 'Authorization': `Bearer ${newAccessToken}` }
              });
              return retryResponse;
            }
          } catch (error) {
            console.error('Error al refrescar el token:', error);
            clearAuth();
            window.location.href = '/login';
            throw error;
          }
        } else {
          clearAuth();
          window.location.href = '/login';
          throw new Error('No hay token de refresco disponible');
        }
      }

      return response;
    } catch (error) {
      console.error('Error en la petición:', error);
      throw error;
    }
  }, [API_BASE_URL, AUTH.REFRESH_TOKEN, clearAuth]);

  // Verificar el estado de autenticación
  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      if (!accessToken) return false;

      const response = await fetch(`${API_BASE_URL}${AUTH.VERIFY}`, {
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
          // Guardar datos del usuario en el estado
          const userData = {
            id: data.user.id,
            cedula: data.user.cedula,
            name: data.user.name || 'Usuario',
            email: data.user.email
          };
          
          setUser(userData);
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
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
  }, [API_BASE_URL, AUTH.VERIFY, clearAuth]);

  // Refrescar el token de acceso
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No hay token de refresco disponible');
      }

      const response = await fetch(`${API_BASE_URL}${AUTH.REFRESH_TOKEN}`, {
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
          // Guardar el nuevo token de acceso
          localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
          
          // Actualizar el token de refresco si se proporciona uno nuevo
          if (data.refreshToken) {
            localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
          }
          
          // Actualizar el estado del usuario si se proporciona
          if (data.user) {
            const userData = {
              id: data.user.id,
              cedula: data.user.cedula,
              name: data.user.name || 'Usuario',
              email: data.user.email
            };
            
            setUser(userData);
            localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
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
  }, [API_BASE_URL, AUTH.REFRESH_TOKEN, clearAuth]);

  // Login - Maneja el inicio de sesión con cédula y contraseña
  const login = useCallback(async (cedula, password) => {
    try {
      setAuthError('');
      console.log('Intentando iniciar sesión con cédula:', cedula);
      
      const response = await fetch(`${API_BASE_URL}${AUTH.LOGIN}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({ cedula, password })
      });

      // Primero obtener el texto de la respuesta
      const responseText = await response.text();
      
      // Intentar analizar el JSON de la respuesta
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error al analizar la respuesta JSON:', e);
        throw new Error('Error en el formato de la respuesta del servidor');
      }

      console.log('Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        success: data.success,
        message: data.message
      });

      if (!response.ok) {
        const errorMessage = data.message || 'Error en el inicio de sesión';
        console.error('Error de autenticación:', data);
        throw new Error(errorMessage);
      }
      
      // Verificar que la respuesta contenga el token y los datos del usuario
      if (!data.token || !data.user) {
        console.error('Respuesta del servidor incompleta:', data);
        throw new Error('Respuesta del servidor inválida');
      }

      // Guardar los tokens en localStorage
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.token);
      
      // Guardar el token de refresco si está disponible
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }

      // Preparar los datos del usuario
      const userData = {
        id: data.user.id,
        cedula: data.user.cedula,
        name: data.user.name || 'Usuario',
        email: data.user.email
      };
      
      // Guardar los datos del usuario en localStorage
      localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
      
      // Actualizar el estado
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError('');
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Error en login:', error);
      // Limpiar credenciales en caso de error
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      setAuthError(error.message || 'Error en el inicio de sesión');
      return { success: false, error: error.message };
    }
  }, [API_BASE_URL, AUTH.LOGIN]);

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

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      // Obtener el token de acceso actual
      const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      
      // Si hay un token, intentar hacer logout en el servidor
      if (accessToken) {
        await fetch(`${API_BASE_URL}${AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });
      }
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
      // Continuar con el logout local aunque falle el logout en el servidor
    } finally {
      // Limpiar el estado de autenticación en cualquier caso
      clearAuth();
    }
  }, [API_BASE_URL, AUTH.LOGOUT, clearAuth]);

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