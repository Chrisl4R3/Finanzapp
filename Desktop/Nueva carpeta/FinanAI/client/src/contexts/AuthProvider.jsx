import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuthContext from './AuthContext';
import { 
  API_BASE_URL, 
  API_ENDPOINTS, 
  AUTH_CONFIG, 
  DEFAULT_HEADERS
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
    console.log('Verificando token en el servidor...');
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
        method: 'GET',
        credentials: 'include', // Importante para las cookies
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      console.log('Respuesta de verificación:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos de usuario recibidos:', data.user);
        
        // Actualizar el usuario en el estado
        if (data.user) {
          const userData = {
            id: data.user.id,
            cedula: data.user.cedula,
            name: data.user.name || 'Usuario',
            email: data.user.email || ''
          };
          setUser(userData);
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData));
        }
        
        setIsAuthenticated(true);
        console.groupEnd('verifyToken');
        return true;
      }
      
      // Si hay un error 401, la sesión podría haber expirado
      if (response.status === 401) {
        console.log('Token inválido o expirado');
        // No limpiar la autenticación aquí, dejar que refreshToken lo maneje
      } else {
        const errorText = await response.text().catch(() => 'Error desconocido');
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
        clearAuth(); // Asegurarse de limpiar cualquier estado residual
        console.groupEnd('checkAuth');
        return false;
      }

      console.log('Verificando token de acceso...');
      
      // Verificar el token actual
      const isTokenValid = await verifyToken(accessToken);
      console.log('Token válido:', isTokenValid);
      
      if (isTokenValid) {
        console.log('Token verificado con éxito');
        console.groupEnd('checkAuth');
        return true;
      }
      
      // Si el token no es válido, intentar refrescarlo
      console.log('Token inválido o expirado, intentando refrescar...');
      const refreshResult = await refreshTokenRef.current();
      
      if (!refreshResult) {
        console.log('No se pudo refrescar el token, limpiando autenticación...');
        clearAuth();
      } else {
        console.log('Token refrescado exitosamente');
      }
      
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
    console.group('refreshToken');
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        console.log('No se encontró token de refresco');
        clearAuth();
        console.groupEnd('refreshToken');
        return false;
      }

      console.log('Solicitando nuevo token con refresh token...');
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        credentials: 'include', // Importante para las cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      console.log('Respuesta de refresh token:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Error al refrescar el token:', response.status);
        clearAuth();
        console.groupEnd('refreshToken');
        return false;
      }

      const data = await response.json();
      console.log('Nuevo token recibido:', !!data.accessToken);
      
      if (!data.accessToken) {
        console.error('No se recibió un nuevo token de acceso');
        clearAuth();
        console.groupEnd('refreshToken');
        return false;
      }
      
      // Guardar el nuevo token de acceso
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.accessToken);
      
      // Actualizar el token de refresco si se proporciona uno nuevo
      if (data.refreshToken) {
        console.log('Nuevo refresh token recibido');
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      // Verificar la sesión para obtener la información del usuario
      console.log('Verificando sesión después del refresh...');
      const isVerified = await verifyToken(data.accessToken);
      
      if (!isVerified) {
        console.error('No se pudo verificar la sesión después del refresh');
        clearAuth();
        console.groupEnd('refreshToken');
        return false;
      }
      
      console.log('Sesión actualizada exitosamente');
      setIsAuthenticated(true);
      console.groupEnd('refreshToken');
      return true;
    } catch (error) {
      console.error('Error al refrescar el token:', error);
      clearAuth();
      return false;
    }
  }, [clearAuth, verifyToken]);

  // Asignar la función al ref
  useEffect(() => {
    refreshTokenRef.current = refreshTokenFn;
  }, [refreshTokenFn]);

  // Login - Maneja el inicio de sesión con cédula y contraseña
  const login = useCallback(async (cedula, password) => {
    try {
      console.log('Iniciando proceso de login...');
      setIsLoading(true);
      setAuthError('');
      
      if (!cedula || !password) {
        throw new Error('La cédula y la contraseña son requeridas');
      }

      console.log('Enviando solicitud de login...');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        credentials: 'include', // Importante para manejar cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ cedula, password })
      });

      console.log('Respuesta del servidor recibida:', response.status, response.statusText);
      console.log('Headers de la respuesta:', Object.fromEntries(response.headers.entries()));

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
        const errorMessage = data?.message || `Error en la autenticación: ${response.statusText}`;
        console.error('Error en la respuesta del servidor:', errorMessage);
        throw new Error(errorMessage);
      }

      // Verificar que la respuesta contenga el token de acceso
      if (!data.token && !data.accessToken) {
        console.error('No se recibió un token de acceso en la respuesta');
        console.log('Datos de respuesta completos:', data);
        throw new Error('Error en la autenticación: no se recibió token de acceso');
      }

      const accessToken = data.token || data.accessToken;
      
      // Guardar el token de acceso y el token de refresco
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      console.log('Tokens guardados en localStorage');

      // Obtener y guardar la información del usuario
      let userInfo = null;
      
      if (data.user) {
        // Si el usuario viene en la respuesta de login
        userInfo = {
          id: data.user.id,
          cedula: data.user.cedula,
          name: data.user.name || 'Usuario',
          email: data.user.email || ''
        };
      } else {
        // Si no viene el usuario, intentar obtenerlo del endpoint de verificación
        try {
          console.log('Obteniendo información del usuario desde el endpoint de verificación...');
          const userResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
            method: 'GET',
            credentials: 'include', // Importante para las cookies
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          console.log('Respuesta de verificación de usuario:', userResponse.status);
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userInfo = {
              id: userData.user?.id,
              cedula: userData.user?.cedula,
              name: userData.user?.name || 'Usuario',
              email: userData.user?.email || ''
            };
            console.log('Información del usuario obtenida:', userInfo);
          } else {
            console.error('Error al obtener información del usuario:', userResponse.statusText);
            // Si hay un error pero la autenticación fue exitosa, continuar con la información mínima
            userInfo = {
              id: 'unknown',
              cedula: cedula,
              name: 'Usuario',
              email: ''
            };
          }
        } catch (userError) {
          console.error('Error al obtener información del usuario:', userError);
          // En caso de error, continuar con la información mínima
          userInfo = {
            id: 'unknown',
            cedula: cedula,
            name: 'Usuario',
            email: ''
          };
        }
      }
      
      // Guardar la información del usuario
      if (userInfo) {
        setUser(userInfo);
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userInfo));
        console.log('Información del usuario guardada');
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
    let isMounted = true;
    
    const verifyAuth = async () => {
      try {
        console.log('Verificando autenticación inicial...');
        const isAuth = await checkAuth();
        console.log('Verificación inicial completada. Autenticado:', isAuth);
        
        // Si el componente sigue montado, actualizar el estado
        if (isMounted) {
          setInitialCheckComplete(true);
          setIsLoading(false);
          console.log('Estado de autenticación inicial establecido');
        }
      } catch (error) {
        console.error('Error en verificación inicial:', error);
        if (isMounted) {
          setInitialCheckComplete(true);
          setIsLoading(false);
          setAuthError('Error al verificar la sesión');
        }
      }
    };

    verifyAuth();
    
    // Cleanup function para evitar actualizaciones de estado en componentes desmontados
    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

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
