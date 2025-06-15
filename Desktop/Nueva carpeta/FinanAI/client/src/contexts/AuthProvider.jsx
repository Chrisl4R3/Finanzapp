import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuthContext from './AuthContext';
import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  AUTH_CONFIG, 
  DEFAULT_HEADERS,
  fetchConfig 
} from '../config/api';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Limpiar el estado de autenticación y los tokens
  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError('');
  }, []);

  // Verificar el estado de autenticación
  // Usar useRef para la función refreshToken para evitar dependencias circulares
  const refreshTokenRef = useRef(null);

  // Función para verificar el token
  const verifyToken = useCallback(async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
        ...fetchConfig,
        method: 'GET',
        headers: {
          ...fetchConfig.headers,
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al verificar el token:', error);
      return false;
    }
  }, []);

  // Verificar el estado de autenticación
  const checkAuth = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      
      // Si no hay token, no hay sesión activa
      if (!accessToken) {
        console.log('No se encontró token de acceso');
        return false;
      }

      console.log('Verificando token de acceso...');
      
      // Verificar el token actual
      const isTokenValid = await verifyToken(accessToken);
      
      if (isTokenValid) {
        return true;
      }
      
      // Si el token no es válido, intentar refrescarlo
      console.log('Token inválido o expirado, intentando refrescar...');
      return await refreshTokenRef.current();
      
    } catch (error) {
      console.error('Error al verificar la autenticación:', error);
      clearAuth();
      return false;
    }
  }, [clearAuth, verifyToken]);

  // Refrescar el token
  const refreshTokenFn = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        console.log('No se encontró token de refresco');
        return false;
      }

      console.log('Refrescando token...');
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        ...fetchConfig,
        method: 'POST',
        headers: {
          ...fetchConfig.headers,
          'Authorization': `Bearer ${refreshToken}`
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        console.error('Error al refrescar el token:', response.status);
        clearAuth();
        return false;
      }

      const data = await response.json();
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
      
      // Actualizar el token de refresco si se proporciona uno nuevo
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      // Obtener información del usuario si no está disponible
      if (!user) {
        try {
          const userResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`,
              ...DEFAULT_HEADERS
            },
            credentials: 'include',
            mode: 'cors'
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData.user);
          }
        } catch (userError) {
          console.error('Error al obtener información del usuario:', userError);
        }
      }
      
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      clearAuth();
      return false;
    }
  }, [user, clearAuth]);

  // Asignar la función al ref
  useEffect(() => {
    refreshTokenRef.current = refreshTokenFn;
  }, [refreshTokenFn]);

  // Login - Maneja el inicio de sesión con cédula y contraseña
  const login = useCallback(async (cedula, password) => {
    try {
      setIsLoading(true);
      setAuthError('');
      
      if (!cedula || !password) {
        throw new Error('La cédula y la contraseña son requeridas');
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        ...fetchConfig,
        method: 'POST',
        body: JSON.stringify({ cedula, password })
      });

      // Procesar la respuesta del servidor
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error al analizar la respuesta del servidor:', e, 'Respuesta:', responseText);
        throw new Error('Error en el formato de la respuesta del servidor');
      }

      console.log('Respuesta del servidor:', { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data.message || 'Error en la autenticación';
        console.error('Error en la respuesta del servidor:', errorMessage);
        throw new Error(errorMessage);
      }

      // Verificar que la respuesta contenga el token de acceso
      if (!data.token) {
        console.error('No se recibió un token de acceso en la respuesta');
        console.log('Datos de respuesta completos:', data);
        throw new Error('Error en la autenticación: no se recibió token de acceso');
      }

      // Guardar el token de acceso y el token de refresco
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.token);
      
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }

      // Obtener y guardar la información del usuario
      if (data.user) {
        const userData = {
          id: data.user.id,
          cedula: data.user.cedula,
          name: data.user.name || 'Usuario',
          email: data.user.email || ''
        };
        
        setUser(userData);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
      } else {
        // Si no se incluye la información del usuario, obtenerla por separado
        try {
          const userResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`,
              ...DEFAULT_HEADERS
            },
            credentials: 'include',
            mode: 'cors'
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            const userInfo = {
              id: userData.user.id,
              cedula: userData.user.cedula,
              name: userData.user.name || 'Usuario',
              email: userData.user.email || ''
            };
            
            setUser(userInfo);
            localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userInfo));
          }
        } catch (userError) {
          console.error('Error al obtener información del usuario:', userError);
        }
      }

      // Actualizar el estado de autenticación
      setIsAuthenticated(true);
      setAuthError('');
      
      // Redirigir al dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      setAuthError(error.message || 'Error al iniciar sesión');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cerrar sesión
  const logout = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      
      if (accessToken) {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...DEFAULT_HEADERS
          },
          credentials: 'include',
          mode: 'cors'
        });
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      clearAuth();
      window.location.href = '/login';
    }
  }, [clearAuth]);

  // Inicializar el estado de autenticación al cargar el componente
  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Error al inicializar la autenticación:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [checkAuth]);

  // Verificar periódicamente el estado de autenticación
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // Verificar cada 5 minutos

    return () => clearInterval(interval);
  }, [checkAuth]);

  // Valor del contexto
  const value = React.useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    checkAuth,
    refreshToken: refreshTokenFn
  }), [
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    logout,
    checkAuth,
    refreshTokenFn
  ]);

  // Eliminar la exportación de useAuth ya que está en AuthContext.jsx
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
