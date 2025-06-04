import { authenticatedFetch } from '../auth/auth';

const API_URL = 'https://backend-production-cf437.up.railway.app/scheduled-transactions';

// Obtener todas las transacciones programadas
export const getAllScheduledTransactions = async () => {
  try {
    const response = await authenticatedFetch(API_URL);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al obtener las transacciones programadas');
    }
    return response.json();
  } catch (error) {
    console.error('Error en getAllScheduledTransactions:', error);
    throw error;
  }
};

// Crear nueva transacción programada
export const createScheduledTransaction = async (transactionData) => {
  try {
    const response = await authenticatedFetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear la transacción programada');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en createScheduledTransaction:', error);
    throw error;
  }
};

// Actualizar transacción programada
export const updateScheduledTransaction = async (id, transactionData) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar la transacción programada');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en updateScheduledTransaction:', error);
    throw error;
  }
};

// Eliminar transacción programada
export const deleteScheduledTransaction = async (id) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al eliminar la transacción programada');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en deleteScheduledTransaction:', error);
    throw error;
  }
};

// Cambiar estado de transacción programada
export const updateScheduledTransactionStatus = async (id, status) => {
  try {
    const response = await authenticatedFetch(`${API_URL}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar el estado de la transacción programada');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error en updateScheduledTransactionStatus:', error);
    throw error;
  }
}; 