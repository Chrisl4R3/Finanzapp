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
export const contributeToGoal = async (goalId, amount, isDirectContribution = false, paymentMethod = 'Efectivo') => {
  try {
    // Validar que el ID sea un número válido
    const idNumber = parseInt(goalId, 10);
    if (isNaN(idNumber) || idNumber <= 0) {
      throw new Error(`El ID de la meta debe ser un número válido: ${goalId}`);
    }
    
    // Convertir a string para asegurar consistencia
    goalId = idNumber.toString();
    
    console.log('Enviando contribución a meta:', { 
      goalId, 
      amount, 
      isDirectContribution,
      timestamp: new Date().toISOString()
    });
    
    const url = `${API_URL}/api/goals/${goalId}/contribute`;
    console.log('URL de la petición:', url);
    
    const requestBody = {
      amount: parseFloat(amount),
      isDirectContribution: Boolean(isDirectContribution),
      paymentMethod
    };
    
    console.log('Cuerpo de la petición:', requestBody);

    try {
      const response = await authenticatedFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(`Datos de la solicitud inválidos: ${responseData.message}`);
        } else if (response.status === 500) {
          throw new Error(`Error del servidor: ${responseData.message}`);
        } else {
          throw new Error(responseData.message || 'Error en el servidor al registrar el abono.');
        }
      }

      console.log('✅ Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      return responseData;
    } catch (error) {
      console.error('Error en contributeToGoal:', {
        message: error.message,
        stack: error.stack,
        goalId,
        amount,
        isDirectContribution,
        paymentMethod
      });
      throw error;
    }
  } catch (error) {
    console.error('Error en contributeToGoal:', {
      message: error.message,
      stack: error.stack,
      goalId,
      amount,
      isDirectContribution,
      paymentMethod
    });
    throw error;
  }
};