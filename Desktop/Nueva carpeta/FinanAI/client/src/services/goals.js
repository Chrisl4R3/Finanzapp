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
  let goal;
  try {
 // Fetch goal details to get the contributed amount
    const goalResponse = await authenticatedFetch(`/goals/${goalId}`);
    if (!goalResponse.ok) {
      throw new Error(`Error fetching goal ${goalId}: ${goalResponse.statusText}`);
    }
    const goal = await goalResponse.json();

    // Create an income transaction for the contributed amount
    if (goal.progress > 0) {
      const incomeTransaction = {
        type: 'Income',
        category: 'Otros-Ingreso', // Or a specific category for goal returns
        amount: goal.progress,
        date: new Date().toISOString().split('T')[0],
        description: `Retorno de meta eliminada: ${goal.name}`,
        payment_method: 'Efectivo', // Or a default payment method for returns
        status: 'Completed',
      };

 await authenticatedFetch('/transactions', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
        },
 body: JSON.stringify(incomeTransaction),
      });
    }

    // Proceed with goal deletion
    const response = await authenticatedFetch(`/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
 'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
 return response.json();
  } catch (error) {
    // If transaction creation fails, still attempt to delete the goal,
    // but log the transaction error.
    console.error('Error creating income transaction for deleted goal:', error);
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