// Usar el proxy configurado en vite.config.js
const API_URL = '/api';

// Función auxiliar para obtener el token
const getStoredToken = () => localStorage.getItem('authToken');

// Función auxiliar para obtener los headers de autenticación
export const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la autenticación');
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      console.log('Token guardado:', data.token);
    }
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en el registro');
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      console.log('Token guardado:', data.token);
    }
    return data;
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
};

export const isAuthenticated = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.isAuthenticated === true;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return false;
  }
};

export const logout = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }

    // Limpiar datos locales
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    localStorage.clear();
    
    return true;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Aún si hay error, limpiamos los datos locales
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    localStorage.clear();
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener el usuario actual');
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
};

export const authenticatedFetch = async (endpoint, options = {}) => {
  try {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers
      },
      ...options
    };

    console.log('Configuración completa de la petición:', {
      url: `${API_URL}${endpoint}`,
      options: defaultOptions
    });

    const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
    
    console.log('Respuesta inicial:', {
      status: response.status,
      statusText: response.statusText
    });

    if (response.status === 401) {
      console.log('Token expirado o inválido, intentando renovar...');
      const refreshResult = await getCurrentUser();
      if (!refreshResult) {
        console.log('No se pudo renovar la sesión, redirigiendo al login...');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
      
      console.log('Sesión renovada, reintentando petición...');
      return await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          ...options.headers
        }
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error en la petición autenticada:', error);
    throw error;
  }
};

export const getDashboardData = async () => {
  try {
    console.log('Obteniendo datos del dashboard...');
    const response = await authenticatedFetch('/transactions/dashboard');
    const data = await response.json();
    console.log('Datos del dashboard obtenidos:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    throw error;
  }
};

export const getRecentTransactions = async () => {
  try {
    console.log('Obteniendo transacciones recientes...');
    const response = await authenticatedFetch('/transactions/recent');
    const data = await response.json();
    console.log('Transacciones recientes obtenidas:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo transacciones recientes:', error);
    throw error;
  }
};

export const getActiveGoals = async () => {
  try {
    console.log('Obteniendo metas activas...');
    const response = await authenticatedFetch('/goals/active');
    const data = await response.json();
    console.log('Metas activas obtenidas:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo metas activas:', error);
    throw error;
  }
};

export const getNotifications = async () => {
  try {
    console.log('Obteniendo notificaciones...');
    const response = await authenticatedFetch('/notifications/unread');
    const data = await response.json();
    console.log('Notificaciones obtenidas:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    throw error;
  }
};
