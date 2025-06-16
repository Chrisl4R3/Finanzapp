import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuthContext from './AuthContext';
import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  AUTH_CONFIG, 
  DEFAULT_HEADERS,
  authFetchConfig 
} from '../config/api';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

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
    console.group('verifyToken');
    try {
      console.log('Verificando token en el servidor...');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
        ...authFetchConfig,
        method: 'GET',
        headers: {
          ...authFetchConfig.headers,
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Respuesta de verificación:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos de usuario recibidos:', data.user);
        setUser(data.user);
        setIsAuthenticated(true);
        console.groupEnd('verifyToken');
        return true;
      } else {
        const errorText = await response.text();
        console.error('Error en la respuesta de verificación:', response.status, errorText);
      }
      
      console.groupEnd('verifyToken');
      return false;
    } catch (error) {
      console.error('Error al verificar el token:', error);
      console.groupEnd('verifyToken');
      return false;
    }
  }, []);

  // Verificar el estado de autenticación
  const checkAuth = useCallback(async () => {
    console.group('checkAuth');
    try {
      const accessToken = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      console.log('Token de acceso encontrado:', !!accessToken);
      
      // Si no hay token, no hay sesión activa
      if (!accessToken) {
        console.log('No se encontró token de acceso');
        console.groupEnd('checkAuth');
        return false;
      }

      console.log('Verificando token de acceso...');
      
      // Verificar el token actual
      const isTokenValid = await verifyToken(accessToken);
      console.log('Token válido:', isTokenValid);
      
      if (isTokenValid) {
        console.groupEnd('checkAuth');
        return true;
      }
      
      // Si el token no es válido, intentar refrescarlo
      console.log('Token inválido o expirado, intentando refrescar...');
      const refreshResult = await refreshTokenRef.current();
      console.log('Resultado del refresh:', refreshResult);
      console.groupEnd('checkAuth');
      return refreshResult;
      
    } catch (error) {
      console.error('Error en checkAuth:', error);
      clearAuth();
      console.groupEnd('checkAuth');
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
        ...authFetchConfig,
        method: 'POST',
        headers: {
          ...authFetchConfig.headers,
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
        ...authFetchConfig,
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
      
      // Limpiar el estado de carga
      setIsLoading(false);
      
      // Devolver éxito
      return { success: true };
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      setAuthError(error.message || 'Error al iniciar sesión');
      throw error;
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

  // Efecto para verificar la autenticación al cargar
  useEffect(() => {
    console.log('Iniciando verificación de autenticación...');
    
    const checkAuthStatus = async () => {
      try {
        console.log('Verificando autenticación...');
        const isAuth = await checkAuth();
        console.log('Estado de autenticación inicial:', isAuth, 'Usuario:', user);
        setInitialCheckComplete(true);
      } catch (error) {
        console.error('Error al verificar la autenticación:', error);
        setInitialCheckComplete(true);
      } finally {
        console.log('Finalizada verificación de autenticación');
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [checkAuth, user]);

  // Verificar periódicamente el estado de autenticación
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // Verificar cada 5 minutos

    return () => clearInterval(interval);
  }, [checkAuth]);

  // Valor del contexto
  const value = {
    user,
    isAuthenticated,
    isLoading,
    initialCheckComplete,
    error: authError,
    login,
    logout,
    checkAuth,
    refreshToken: refreshTokenFn,
    clearAuth
  };

  // Eliminar la exportación de useAuth ya que está en AuthContext.jsx
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
