const API_URL = 'http://localhost:3000/api';

export const login = async (credentials) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error en la autenticación');
  }

  const data = await response.json();
  sessionStorage.setItem('user', JSON.stringify(data.user));
  sessionStorage.setItem('token', data.token);
  return data;
};

export const register = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error en el registro');
  }

  return await response.json();
};

export const isAuthenticated = () => {
  const token = sessionStorage.getItem('token');
  return token !== null;
};

export const logout = () => {
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
};

export const getCurrentUser = () => {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getAuthToken = () => {
  return sessionStorage.getItem('token');
};

export const authenticatedFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('401: No hay token de autenticación');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    ...options
  };

  const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
  if (!response.ok) {
    const errorMessage = `${response.status}: ${response.statusText}`;
    console.error('Error en la petición:', {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      headers: defaultOptions.headers
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
