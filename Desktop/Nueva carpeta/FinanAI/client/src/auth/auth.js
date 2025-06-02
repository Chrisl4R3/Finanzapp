const API_URL = 'https://backend-production-cf437.up.railway.app/api';

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
    // Guardamos el token en localStorage para peticiones autenticadas
    if (data.token) {
      localStorage.setItem('authToken', data.token);
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
    }
    return data;
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
};

export const isAuthenticated = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
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
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
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
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
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
    const token = localStorage.getItem('authToken');
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
    
    if (response.status === 401) {
      // Si la sesión expiró, intentamos renovarla
      const refreshResult = await getCurrentUser();
      if (!refreshResult) {
        // Si no se pudo renovar, redirigimos al login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Sesión expirada');
      }
      // Reintentamos la petición original
      return await fetch(`${API_URL}${endpoint}`, defaultOptions);
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error en la petición: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Error en la petición autenticada:', error);
    throw error;
  }
};

export const getDashboardData = async () => {
  try {
    const response = await authenticatedFetch('/transactions/dashboard');
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    throw error;
  }
};

export const getRecentTransactions = async () => {
  try {
    const response = await authenticatedFetch('/transactions/recent');
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo transacciones recientes:', error);
    throw error;
  }
};

export const getActiveGoals = async () => {
  try {
    const response = await authenticatedFetch('/goals/active');
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo metas activas:', error);
    throw error;
  }
};

export const getNotifications = async () => {
  try {
    const response = await authenticatedFetch('/notifications/unread');
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    throw error;
  }
};
