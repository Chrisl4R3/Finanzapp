// Configuración de la API
export const API_BASE_URL = window.env?.REACT_APP_API_URL || 'https://backend-production-cf437.up.railway.app/api';

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
  credentials: 'include', // Incluir credenciales (cookies) en todas las solicitudes
  mode: 'cors',
  headers: DEFAULT_HEADERS,
  // Asegurar que las cookies se envíen en solicitudes cross-origin
  // y que se respeten las políticas de SameSite
  // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#sending_a_request_with_credentials_included
  // https://web.dev/samesite-cookies-explained/
};

// Configuración específica para solicitudes con credenciales
const authFetchConfig = {
  ...fetchConfig,
  credentials: 'include', // Asegurarse de incluir credenciales
  headers: {
    ...DEFAULT_HEADERS,
    // Asegurarse de incluir el token de autorización si está disponible
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Authorization': localStorage.getItem('finanzapp_access_token') 
      ? `Bearer ${localStorage.getItem('finanzapp_access_token')}` 
      : ''
  }
};

export { fetchConfig, authFetchConfig };
