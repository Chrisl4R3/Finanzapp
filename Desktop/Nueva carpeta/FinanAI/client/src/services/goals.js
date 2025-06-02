const API_URL = 'http://localhost:3000/api';

// Obtener todas las metas
export const getAllGoals = async () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status} al obtener las metas.`);
    }

    return response.json();
  } catch (error) {
    console.error('Error en getAllGoals:', error);
    throw error;
  }
};

// Obtener metas activas
export const getActiveGoals = async () => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals/active`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status} al obtener las metas activas.`);
    }

    return response.json();
  } catch (error) {
    console.error('Error en getActiveGoals:', error);
    throw error;
  }
};

// Crear nueva meta
export const createGoal = async (goalData) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(goalData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear la meta');
    }

    return response.json();
  } catch (error) {
    console.error('Error en createGoal:', error);
    throw error;
  }
};

// Actualizar meta existente
export const updateGoal = async (goalId, goalData) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(goalData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar la meta');
    }

    return response.json();
  } catch (error) {
    console.error('Error en updateGoal:', error);
    throw error;
  }
};

// Actualizar progreso de meta
export const updateGoalProgress = async (goalId, progress) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals/${goalId}/progress`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ progress }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar el progreso');
    }

    return response.json();
  } catch (error) {
    console.error('Error en updateGoalProgress:', error);
    throw error;
  }
};

// Eliminar meta
export const deleteGoal = async (goalId) => {
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  try {
    const response = await fetch(`${API_URL}/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al eliminar la meta');
    }

    return response.json();
  } catch (error) {
    console.error('Error en deleteGoal:', error);
    throw error;
  }
};

// Abonar a una meta
export const contributeToGoal = async (goalId, amount, isDirectContribution = false) => {
  console.log('Iniciando contribución a meta:', { goalId, amount, isDirectContribution });
  
  const token = sessionStorage.getItem('token');
  if (!token) {
    throw new Error('No autenticado');
  }

  if (!goalId) {
    throw new Error('ID de meta no proporcionado');
  }

  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  const url = `${API_URL}/goals/${goalId}/contribute`;
  console.log('URL de la petición:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        amount: parseFloat(amount),
        isDirectContribution
      }),
    });

    console.log('Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message;
      } catch (e) {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage || 'Error al abonar a la meta');
    }

    const data = await response.json();
    console.log('Respuesta exitosa:', data);
    
    // Esperar un momento antes de retornar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return data;
  } catch (error) {
    console.error('Error en contributeToGoal:', error);
    throw new Error('Error al procesar el abono. Por favor, actualiza la página para ver el estado actual.');
  }
}; 