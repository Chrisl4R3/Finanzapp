const API_URL = 'https://backend-production-cf437.up.railway.app/api';

// Función auxiliar para obtener el token
const getStoredToken = () => localStorage.getItem('authToken');

// Función auxiliar para configurar headers
const getAuthHeaders = () => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
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
  const token = getStoredToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  console.log('Realizando petición a:', url); // Log para depuración
  
  const defaultOptions = {
    credentials: 'include', // Asegura que las cookies se envíen
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {}),
      },
    });

    console.log('Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    // Manejo específico para errores de sesión
    if (response.status === 401) {
      console.log('Sesión expirada, redirigiendo a login');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Tu sesión ha expirado');
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = 'Error en la petición';
      
      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          const text = await response.text();
          console.error('Error en respuesta no JSON:', text);
        }
      } catch (e) {
        console.error('Error al procesar respuesta de error:', e);
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    console.error('Error en la petición:', {
      endpoint,
      error: error.message,
      stack: error.stack
    });
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
