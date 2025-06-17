import pool from '../config/db.js';

export const getUserBalance = async (userId) => {
  try {
    const [result] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions 
      WHERE user_id = ?`,
      [userId]
    );

    if (result.length === 0) return 0;

    const { total_income, total_expense } = result[0];
    return total_income - total_expense;
  } catch (error) {
    console.error('Error al obtener saldo:', error);
    throw error;
  }
};

export const updateBalanceAfterTransaction = async (userId, amount, type) => {
  try {
    // No necesitamos hacer nada especial aquí ya que el saldo se calcula en tiempo real
    // La transacción ya se ha creado y el saldo se actualizará automáticamente
    return true;
  } catch (error) {
    console.error('Error al actualizar saldo:', error);
    throw error;
  }
};
