const API_URL = 'https://backend-production-cf437.up.railway.app/api';
const REFRESH_TOKEN_KEY = 'refreshToken';
const ACCESS_TOKEN_KEY = 'authToken';

// Función auxiliar para obtener el token
const getStoredToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

// Función auxiliar para configurar headers
const getAuthHeaders = () => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Función para refrescar el token
const refreshToken = async () => {
  try {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay token de refresco disponible');
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Error al refrescar el token');
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
      return data.token;
    }
    return null;
  } catch (error) {
    console.error('Error al refrescar token:', error);
    return null;
  }
};

export const isAuthenticated = async () => {
  try {
    const token = getStoredToken();
    if (!token) {
      return false;
    }

    // Intentar obtener el usuario actual
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) {
      // Intentar refrescar el token
      const newToken = await refreshToken();
      if (newToken) {
        // Reintentar la verificación con el nuevo token
        const newResponse = await fetch(`${API_URL}/auth/verify`, {
          method: 'GET',
          headers: { ...getAuthHeaders(), 'Authorization': `Bearer ${newToken}` },
          credentials: 'include',
        });
        return newResponse.ok;
      }
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return false;
  }
};

export const logout = async () => {
  try {
    // Primero intentar cerrar sesión en el backend
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    // Limpiar tokens y datos locales
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.clear();
    localStorage.clear();
    
    return response.ok;
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Aún si hay error, limpiamos los datos locales
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.clear();
    localStorage.clear();
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/user`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) {
      await refreshToken();
      const newResponse = await fetch(`${API_URL}/auth/user`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      return newResponse.json();
    }

    return response.json();
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    throw error;
  }
};

// Función para manejar peticiones con autenticación
export const authenticatedFetch = async (endpoint, options = {}) => {
  const defaultOptions = {
    credentials: 'include',
    headers: getAuthHeaders()
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);

    if (response.status === 401) {
      // Intentar refrescar el token
      const newToken = await refreshToken();
      if (newToken) {
        // Reintentar la petición con el nuevo token
        const newOptions = { ...mergedOptions, headers: { ...mergedOptions.headers, 'Authorization': `Bearer ${newToken}` } };
        return fetch(`${API_URL}${endpoint}`, newOptions);
      }
    }

    return response;
  } catch (error) {
    console.error('Error en authenticatedFetch:', error);
    throw error;
  }
};
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
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  // Manejo específico para errores de sesión
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Tu sesión ha expirado');
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la petición');
    } else {
      throw new Error('Error en la petición al servidor');
    }
  }

  return response;
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
