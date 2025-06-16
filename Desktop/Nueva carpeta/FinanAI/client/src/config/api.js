// Configuración de la API
export const API_BASE_URL = 'https://backend-production-cf437.up.railway.app/api';

// Configuración de endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout'
  },
  TRANSACTIONS: {
    BASE: '/transactions',
    STATISTICS: '/transactions/statistics',
    DASHBOARD: '/transactions/dashboard'
  }
};

// Configuración de autenticación
export const AUTH_CONFIG = {
  TOKEN_KEY: 'finanzapp_access_token',
  REFRESH_TOKEN_KEY: 'finanzapp_refresh_token',
  USER_KEY: 'finanzapp_user',
  SESSION_EXPIRATION: 24 * 60 * 60 // 24 horas
};

// Headers por defecto
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Configuración común para fetch
const fetchConfig = {
  mode: 'cors',
  credentials: 'include', // Importante: permite enviar cookies
  headers: {
    ...DEFAULT_HEADERS,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Requested-With': 'XMLHttpRequest' // Ayuda a identificar peticiones AJAX
  }
};

// Configuración para solicitudes que requieren autenticación
const getAuthHeader = () => {
  const token = localStorage.getItem('finanzapp_access_token');
  return token ? `Bearer ${token}` : '';
};

const authFetchConfig = {
  ...fetchConfig,
  headers: {
    ...fetchConfig.headers,
    'Authorization': getAuthHeader()
  }
};

// Interceptor para manejar respuestas no autorizadas
const handleUnauthorized = async (response) => {
  if (response.status === 401) {
    console.warn('Sesión expirada o no autorizada');
    // Aquí podrías implementar lógica de refresco de token
    return false;
  }
  return response;
};

// Función fetch mejorada con manejo de errores
const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...fetchConfig,
      ...options,
      headers: {
        ...fetchConfig.headers,
        ...(options.headers || {})
      }
    });
    
    // Manejar respuestas no exitosas
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Error en la solicitud');
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en la petición:', error);
    throw error;
  }
};

// Exportar las configuraciones y utilidades
export { 
  fetchConfig, 
  authFetchConfig, 
  handleUnauthorized as _handleUnauthorized, 
  apiFetch as _apiFetch 
};
