import { authenticatedFetch } from '../auth/auth';

const API_URL = 'https://backend-production-cf437.up.railway.app';

// Obtener todas las metas
export const getAllGoals = async () => {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/goals`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener las metas');
    }
    return response.json();
  } catch (error) {
    console.error('Error en getAllGoals:', error);
    throw error;
  }
};

// Obtener metas activas
export const getActiveGoals = async () => {
  try {
    const response = await authenticatedFetch('/api/goals/active');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al obtener las metas activas');
    }
    return response.json();
  } catch (error) {
    console.error('Error en getActiveGoals:', error);
    throw error;
  }
};

// Crear nueva meta
export const createGoal = async (goalData) => {
  try {
    const response = await authenticatedFetch('/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
  try {
    const response = await authenticatedFetch(`/api/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
  try {
    const response = await authenticatedFetch(`/api/goals/${goalId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progress }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al actualizar el progreso de la meta');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en updateGoalProgress:', error);
    throw error;
  }
};

// Eliminar meta
export const deleteGoal = async (goalId) => {
  try {
    const response = await authenticatedFetch(`/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
  try {
    console.log('Enviando contribución a meta:', { goalId, amount, isDirectContribution });
    
    const response = await authenticatedFetch(`${API_URL}/api/goals/${goalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        isDirectContribution: Boolean(isDirectContribution)
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || 'Error al realizar el aporte a la meta';
      console.error('Error en la respuesta del servidor:', errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Contribución exitosa:', result);
    return result;
  } catch (error) {
    console.error('Error en contributeToGoal:', {
      message: error.message,
      stack: error.stack,
      goalId,
      amount,
      isDirectContribution
    });
    throw error;
  }
};