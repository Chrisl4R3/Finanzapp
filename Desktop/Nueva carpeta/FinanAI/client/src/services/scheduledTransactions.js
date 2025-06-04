import { authenticatedFetch } from '../auth/auth';

// Obtener todas las transacciones programadas
export const getAllScheduledTransactions = async () => {
  try {
    const response = await authenticatedFetch('/scheduled-transactions');
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
      body: JSON.stringify(transactionData),
    });
    return response.json();
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
      body: JSON.stringify(transactionData),
    });
    return response.json();
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
    return response.json();
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
      body: JSON.stringify({ status }),
    });
    return response.json();
  } catch (error) {
    console.error('Error en updateScheduledTransactionStatus:', error);
    throw error;
  }
}; 