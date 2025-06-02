const pool = require('../db');

async function executeScheduledTransactions() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Obtener transacciones programadas activas que deben ejecutarse
    const [transactions] = await connection.query(`
      SELECT * FROM scheduled_transactions 
      WHERE status = 'Active' 
      AND (next_execution <= CURDATE() OR next_execution IS NULL)
      AND (end_date IS NULL OR end_date >= CURDATE())
    `);

    for (const transaction of transactions) {
      // Crear la transacción real
      await connection.query(
        `INSERT INTO transactions 
         (user_id, description, amount, type, category, payment_method, date) 
         VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          transaction.user_id,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.category,
          transaction.payment_method
        ]
      );

      // Calcular la próxima fecha de ejecución
      let nextDate = new Date(transaction.next_execution || transaction.start_date);
      
      switch (transaction.frequency) {
        case 'Daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'Weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'Monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'Yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Actualizar la última y próxima ejecución
      await connection.query(
        `UPDATE scheduled_transactions 
         SET last_execution = CURDATE(),
             next_execution = ?,
             status = CASE 
               WHEN ? > end_date THEN 'Completed'
               ELSE status 
             END
         WHERE id = ?`,
        [nextDate, nextDate, transaction.id]
      );
    }

    await connection.commit();
    console.log(`Executed ${transactions.length} scheduled transactions successfully`);
  } catch (error) {
    await connection.rollback();
    console.error('Error executing scheduled transactions:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Ejecutar el script
executeScheduledTransactions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 