const API_URL = 'https://backend-production-cf437.up.railway.app'; // Quitamos /api de la URL base

// Función auxiliar para obtener el token
export const getStoredToken = () => {
  const token = localStorage.getItem('authToken');
  return token || null;
};

export const login = async (credentials) => {
  try {
    console.log('=== login ===');
    console.log('Iniciando proceso de login...');
    console.log('URL de login:', `${API_URL}/api/auth/login`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(credentials),
    });

    console.log('Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorMessage = 'Error en la autenticación';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error('Error del servidor:', errorData);
      } catch (e) {
        console.error('No se pudo analizar la respuesta de error:', e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Login exitoso, datos recibidos:', data);
    
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      console.log('Token guardado en localStorage');
    }
    
    return data;
  } catch (error) {
    console.error('Error en login:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(error.response && {
        response: {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: Object.fromEntries(error.response.headers.entries())
        }
      })
    });
    
    // Limpiar credenciales en caso de error
    localStorage.removeItem('authToken');
    
    // Lanzar un error más descriptivo
    const errorMessage = error.message || 'Error de conexión. Por favor, verifica tu conexión e inténtalo de nuevo.';
    const loginError = new Error(errorMessage);
    loginError.name = 'LoginError';
    throw loginError;
  }
};

export const register = async (userData) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
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
  const token = getStoredToken();
  if (!token) {
    console.log('No se encontró token en localStorage');
    return false;
  }

  try {
    console.log('Verificando autenticación...');
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Respuesta de verificación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      console.log('La verificación falló con estado:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Datos de verificación:', data);
    
    return data.isAuthenticated === true;
  } catch (error) {
    console.error('Error verificando autenticación:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return false;
  }
};

export const logout = async () => {
  const token = getStoredToken();
  
  // Limpiar datos locales primero para asegurar que no haya estado inconsistente
  localStorage.removeItem('authToken');
  sessionStorage.clear();
  localStorage.clear();
  
  if (!token) {
    console.log('No hay token para cerrar sesión en el servidor');
    return true;
  }
  
  try {
    console.log('Cerrando sesión en el servidor...');
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Respuesta de cierre de sesión:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      console.warn('El servidor reportó un error al cerrar sesión, pero la sesión local se ha limpiado');
    }
    
    return true;
  } catch (error) {
    console.error('Error al cerrar sesión en el servidor (sesión local ya limpiada):', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    // No relanzamos el error ya que ya limpiamos el estado local
    return true;
  }
};

export const getCurrentUser = async () => {
  const token = getStoredToken();
  if (!token) {
    console.log('No se puede obtener el usuario actual: no hay token');
    return null;
  }

  try {
    console.log('Obteniendo información del usuario actual...');
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Respuesta de verificación de usuario:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      console.error('Error al obtener el usuario actual:', await response.text());
      return null;
    }

    const data = await response.json();
    console.log('Datos del usuario:', data.user);
    return data.user || null;
  } catch (error) {
    console.error('Error al obtener usuario actual:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
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
