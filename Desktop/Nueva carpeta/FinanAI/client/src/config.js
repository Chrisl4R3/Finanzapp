// Configuración de la API
export const API_CONFIG = {
  // URL base de la API
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Configuración de endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      VERIFY: '/auth/verify',
      REFRESH_TOKEN: '/auth/refresh-token',
      LOGOUT: '/auth/logout'
    },
    TRANSACTIONS: {
      BASE: '/transactions',
      STATISTICS: '/transactions/statistics'
    },
    // Agregar más endpoints según sea necesario
  },
  
  // Configuración de headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Tiempo máximo de espera para las peticiones (en milisegundos)
  TIMEOUT: 10000,
  
  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Configuración de la aplicación
export const APP_CONFIG = {
  APP_NAME: 'FinanzApp',
  // Otras configuraciones de la aplicación
};

// Configuración de autenticación
export const AUTH_CONFIG = {
  // Clave para almacenar el token en localStorage
  TOKEN_KEY: 'finanzapp_access_token',
  REFRESH_TOKEN_KEY: 'finanzapp_refresh_token',
  // Tiempo de expiración de la sesión (en segundos)
  SESSION_EXPIRATION: 24 * 60 * 60, // 24 horas
  // Clave para almacenar el usuario en localStorage
  USER_KEY: 'finanzapp_user'
};
