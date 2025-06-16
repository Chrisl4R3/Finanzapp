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
    console.log('Limpiando autenticación...');
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError('');
  }, []);

  // Verificar el estado de autenticación
  const refreshTokenRef = useRef(null);

  // Función para verificar el token
  const verifyToken = useCallback(async (token) => {
    console.group('=== verifyToken ===');
    console.log('Iniciando verificación de token...');
    console.log('URL de verificación:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`);
    
    try {
      console.log('Enviando solicitud de verificación de token...');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
        method: 'GET',
        credentials: 'include', // Importante para las cookies
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Debug': 'verify-token-request'
        }
      });

      console.log('=== Respuesta del servidor (verifyToken) ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Respuesta en texto plano:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Respuesta parseada:', data);
      } catch (e) {
        const errorMsg = `Error al analizar la respuesta del servidor: ${e.message}`;
        console.error(errorMsg, 'Respuesta recibida:', responseText);
        throw new Error('Error en el formato de la respuesta del servidor');
      }

      if (response.ok) {
        console.log('Token verificado correctamente');
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
      
      if (response.status === 401) {
        console.log('Token inválido o expirado');
      } else {
        console.error('Error en la respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          error: data?.message || 'Error desconocido'
        });
      }
      
      console.groupEnd('verifyToken');
      return false;
    } catch (error) {
      console.error('Error al verificar el token:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      console.groupEnd('verifyToken');
      return false;
    }
  }, []);

  // Función para refrescar el token
  const refreshTokenFn = useCallback(async () => {
    console.group('=== refreshToken ===');
    console.log('Iniciando refresco de token...');
    
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        console.log('No hay token de refresco disponible');
        console.groupEnd('refreshToken');
        return false;
      }
      
      console.log('Enviando solicitud de refresco de token...');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      console.log('=== Respuesta del servidor (refreshToken) ===');
      console.log('Status:', response.status, response.statusText);
      
      const data = await response.json().catch(() => ({}));
      console.log('Datos de respuesta:', data);
      
      if (!response.ok) {
        console.error('Error al refrescar el token:', data.message || 'Error desconocido');
        console.groupEnd('refreshToken');
        return false;
      }
      
      if (!data.token) {
        console.error('No se recibió un nuevo token de acceso');
        console.groupEnd('refreshToken');
        return false;
      }
      
      // Guardar el nuevo token
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, data.token);
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      console.log('Token refrescado exitosamente');
      
      // Verificar el nuevo token
      const isVerified = await verifyToken(data.token);
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
      console.error('Error al refrescar el token:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
    const loginGroup = '=== login ===';
    console.group(loginGroup);
    console.time('login-duration');
    
    try {
      console.log('Iniciando proceso de login...');
      setIsLoading(true);
      setAuthError('');
      
      if (!cedula || !password) {
        const errorMsg = 'La cédula y la contraseña son requeridas';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const loginUrl = `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`;
      console.log('URL de login:', loginUrl);
      console.log('Enviando credenciales a:', loginUrl);
      
      const requestBody = { cedula, password };
      console.log('Cuerpo de la solicitud:', { cedula: cedula, password: '***' });
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        credentials: 'include', // Importante para manejar cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Debug': 'login-request'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Solicitud enviada, esperando respuesta...');

      console.log('=== Respuesta del servidor ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      // Obtener el texto de la respuesta
      const responseText = await response.text();
      console.log('Respuesta en texto plano:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Respuesta parseada:', data);
      } catch (e) {
        const errorMsg = `Error al analizar la respuesta del servidor: ${e.message}`;
        console.error(errorMsg, 'Respuesta recibida:', responseText);
        throw new Error('Error en el formato de la respuesta del servidor');
      }

      // Verificar si hubo un error en la respuesta
      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `Error en la autenticación: ${response.statusText}`;
        console.error('Error en la respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: data
        });
        throw new Error(errorMessage);
      }

      // Verificar que la respuesta contenga el token de acceso
      if (!data.token && !data.accessToken) {
        const errorMsg = 'No se recibió un token de acceso en la respuesta';
        console.error(errorMsg, 'Datos de respuesta:', data);
        throw new Error('Error en la autenticación: no se recibió token de acceso');
      }

      const accessToken = data.token || data.accessToken;
      console.log('Token de acceso recibido:', accessToken ? '***' + accessToken.slice(-8) : 'No disponible');
      
      // Guardar el token de acceso y el token de refresco
      console.log('Guardando tokens en localStorage...');
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, accessToken);
      
      if (data.refreshToken) {
        console.log('Guardando token de refresco...');
        localStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken);
      } else {
        console.warn('No se recibió token de refresco en la respuesta');
      }
      
      console.log('Tokens guardados exitosamente en localStorage');

      // Obtener y guardar la información del usuario
      console.log('Procesando información del usuario...');
      let userInfo = null;
      
      if (data.user) {
        // Si el usuario viene en la respuesta de login
        console.log('Información del usuario recibida en la respuesta de login:', data.user);
        userInfo = {
          id: data.user.id,
          cedula: data.user.cedula,
          name: data.user.name || 'Usuario',
          email: data.user.email || ''
        };
        console.log('Información del usuario procesada:', userInfo);
      } else {
        // Si no viene el usuario, intentar obtenerlo del endpoint de verificación
        console.log('La respuesta no incluye información del usuario, intentando obtenerla del endpoint de verificación...');
        try {
          console.log('Obteniendo información del usuario desde el endpoint de verificación...');
          const userResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-Requested-With': 'XMLHttpRequest'
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
      console.error('Error durante el login:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Limpiar tokens en caso de error
      console.warn('Limpiando tokens debido a un error...');
      clearAuth();
      
      const errorMessage = error.message || 'Error al iniciar sesión';
      setAuthError(errorMessage);
      
      console.timeEnd('login-duration');
      console.groupEnd(loginGroup);
      
      throw new Error(errorMessage);
    } finally {
      console.log('Finalizando proceso de login...');
      setIsLoading(false);
      console.timeEnd('login-duration');
      console.groupEnd(loginGroup);
    }
  }, [clearAuth]);

  // Cerrar sesión
  const logout = useCallback(async () => {
    console.group('=== logout ===');
    try {
      console.log('Iniciando cierre de sesión...');
      setIsLoading(true);
      
      // Intentar hacer logout en el servidor
      try {
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        if (token) {
          console.log('Enviando solicitud de logout al servidor...');
          await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          console.log('Solicitud de logout enviada al servidor');
        }
      } catch (error) {
        console.error('Error al hacer logout en el servidor:', error);
        // Continuar con el logout local aunque falle el logout en el servidor
      }
      
      // Limpiar el estado local
      clearAuth();
      console.log('Sesión cerrada exitosamente');
      
    } catch (error) {
      console.error('Error durante el logout:', error);
      // Asegurarse de limpiar el estado incluso si hay un error
      clearAuth();
      throw error;
    } finally {
      setIsLoading(false);
      console.groupEnd('logout');
    }
  }, [clearAuth]);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.group('=== checkAuthStatus ===');
      try {
        console.log('Verificando estado de autenticación...');
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        
        if (!token) {
          console.log('No se encontró token de acceso');
          clearAuth();
          return;
        }
        
        console.log('Token encontrado, verificando...');
        const isValid = await verifyToken(token);
        
        if (!isValid && refreshTokenRef.current) {
          console.log('Token inválido, intentando refrescar...');
          const refreshed = await refreshTokenRef.current();
          if (!refreshed) {
            console.log('No se pudo refrescar la sesión');
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Error al verificar la autenticación:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
        setInitialCheckComplete(true);
        console.log('Verificación de autenticación completada');
        console.groupEnd('checkAuthStatus');
      }
    };
    
    checkAuthStatus();
  }, [clearAuth, verifyToken]);

  // Valor del contexto
  const contextValue = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    initialCheckComplete,
    login,
    logout,
    clearAuth,
    refreshToken: refreshTokenFn,
    checkAuth: verifyToken
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
