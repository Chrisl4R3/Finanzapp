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
