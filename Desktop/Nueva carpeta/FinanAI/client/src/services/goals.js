import { authenticatedFetch } from '../auth/auth';

const API_URL = 'https://backend-production-cf437.up.railway.app/api';

// Obtener todas las metas
export const getAllGoals = async () => {
  try {
    const response = await authenticatedFetch('/goals');
    return response.json();
  } catch (error) {
    console.error('Error en getAllGoals:', error);
    throw error;
  }
};

// Obtener metas activas
export const getActiveGoals = async () => {
  try {
    const response = await authenticatedFetch('/goals/active');
    return response.json();
  } catch (error) {
    console.error('Error en getActiveGoals:', error);
    throw error;
  }
};

// Crear nueva meta
export const createGoal = async (goalData) => {
  try {
    const response = await authenticatedFetch('/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });
    return response.json();
  } catch (error) {
    console.error('Error en createGoal:', error);
    throw error;
  }
};

// Actualizar meta existente
export const updateGoal = async (goalId, goalData) => {
  try {
    const response = await authenticatedFetch(`/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
    });
    return response.json();
  } catch (error) {
    console.error('Error en updateGoal:', error);
    throw error;
  }
};

// Actualizar progreso de meta
export const updateGoalProgress = async (goalId, progress) => {
  try {
    const response = await authenticatedFetch(`/goals/${goalId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progress }),
    });
    return response.json();
  } catch (error) {
    console.error('Error en updateGoalProgress:', error);
    throw error;
  }
};

// Eliminar meta
export const deleteGoal = async (goalId, reason) => {
  try {
    const response = await authenticatedFetch(`/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
 'Content-Type': 'application/json',
      },
 body: JSON.stringify({ reason }),
    });
    return response.json();
  } catch (error) {
    console.error('Error en deleteGoal:', error);
    throw error;
  }
};

// Abonar a una meta
export const contributeToGoal = async (goalId, amount, isDirectContribution = false) => {
  console.log('Iniciando contribución a meta:', { goalId, amount, isDirectContribution });
  
  if (!goalId) {
    throw new Error('ID de meta no proporcionado');
  }

  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  try {
    const response = await authenticatedFetch(`/goals/${goalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, isDirectContribution }),
    });
    return response.json();
  } catch (error) {
    console.error('Error en contributeToGoal:', error);
    throw error;
  }
}; 