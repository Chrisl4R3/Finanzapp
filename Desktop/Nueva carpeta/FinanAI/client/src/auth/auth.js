const API_URL = 'https://backend-production-cf437.up.railway.app/api';

export const login = async (credentials) => {
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
  return data;
};

export const register = async (userData) => {
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

  return await response.json();
};

export const isAuthenticated = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
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
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }

    // Limpiar cualquier dato local
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
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
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
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
    
    if (response.status === 401) {
      // Si la sesión expiró, redirigir al login
      window.location.href = '/login';
      throw new Error('Sesión expirada');
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
  const response = await authenticatedFetch('/transactions/dashboard');
  const data = await response.json();
  return data;
};

export const getRecentTransactions = async () => {
  const response = await authenticatedFetch('/transactions/recent');
  return response.json();
};

export const getActiveGoals = async () => {
  const response = await authenticatedFetch('/goals/active');
  return response.json();
};

export const getNotifications = async () => {
  const response = await authenticatedFetch('/notifications/unread');
  return response.json();
};
