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
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const logout = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
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
    ...options
  };

  const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
  if (!response.ok) {
    const errorMessage = `${response.status}: ${response.statusText}`;
    console.error('Error en la petición:', {
      status: response.status,
      statusText: response.statusText,
      endpoint
    });
    throw new Error(errorMessage);
  }
  return response;
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
