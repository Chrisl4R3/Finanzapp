import { authenticatedFetch } from '../auth/auth';

// Obtener todas las transacciones programadas
export const getAllScheduledTransactions = async () => {
  try {
    const response = await authenticatedFetch('/scheduled-transactions');
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
    const response = await authenticatedFetch('/scheduled-transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al crear la transacción programada');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error en createScheduledTransaction:', error);
    throw error;
  }
};

// Actualizar transacción programada
export const updateScheduledTransaction = async (id, transactionData) => {
  try {
    const response = await authenticatedFetch(`/scheduled-transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al actualizar la transacción programada');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error en updateScheduledTransaction:', error);
    throw error;
  }
};

// Eliminar transacción programada
export const deleteScheduledTransaction = async (id) => {
  try {
    const response = await authenticatedFetch(`/scheduled-transactions/${id}`, {
      method: 'DELETE'
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al eliminar la transacción programada');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error en deleteScheduledTransaction:', error);
    throw error;
  }
};

// Cambiar estado de transacción programada
export const updateScheduledTransactionStatus = async (id, status) => {
  try {
    const response = await authenticatedFetch(`/scheduled-transactions/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error al actualizar el estado de la transacción programada');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error en updateScheduledTransactionStatus:', error);
    throw error;
  }
}; 