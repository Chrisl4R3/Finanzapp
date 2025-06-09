// Abonar a una meta
router.post('/:id/contribute', async (req, res) => {
  try {
    console.log('\n=== Iniciando contribución a meta ===');
    console.log('Parámetros:', req.params);
    console.log('Body:', req.body);
    console.log('Usuario:', req.userId);

    const { id } = req.params;
    const { amount, isDirectContribution, paymentMethod } = req.body;
    const { userId } = req;

    if (!amount || amount <= 0) {
      console.log('❌ Monto inválido:', amount);
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    console.log('🔍 Buscando meta...');
    // Verificar que la meta existe y pertenece al usuario
    const [goals] = await pool.query(
      'SELECT * FROM goals WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    console.log('Resultado búsqueda:', goals);

    if (goals.length === 0) {
      console.log('❌ Meta no encontrada o no pertenece al usuario');
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    const goal = goals[0];
    console.log('✅ Meta encontrada:', goal);

    let newProgress = parseFloat(goal.progress || 0) + parseFloat(amount);
    console.log('Nuevo progreso calculado:', newProgress);
    
    try {
      // Redondear newProgress a dos decimales para ajustarse al tipo decimal(10,2) de la BD
      newProgress = parseFloat(newProgress.toFixed(2));
      console.log('Valor de newProgress redondeado:', newProgress);

      // Actualizar el progreso de la meta
      console.log('📝 Actualizando progreso de la meta...');
      await pool.query(
        'UPDATE goals SET progress = ?, status = ? WHERE id = ?',
        [newProgress, newProgress >= goal.target_amount ? 'Completed' : 'Active', id]
      );
      console.log('✅ Progreso actualizado');

      // Solo registrar la transacción si no es una contribución directa
      if (!isDirectContribution) {
        console.log('📝 Registrando transacción en el presupuesto...');
        const transactionData = {
          userId,
          type: 'Expense',
          category: 'Otros-Gasto',
          amount,
          description: `Abono a meta: ${goal.name}`,
          payment_method: paymentMethod,
          status: 'Completed',
          date: new Date()
        };
        console.log('Datos de la transacción:', transactionData);

        const [transactionResult] = await pool.query(
          'INSERT INTO transactions (user_id, type, category, amount, description, payment_method, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            'Expense',
            'Otros-Gasto',
            amount,
            `Abono a meta: ${goal.name}`,
            paymentMethod,
            'Completed',
            new Date()
          ]
        );
        console.log('✅ Transacción registrada con ID:', transactionResult.insertId);
      } else {
        console.log('ℹ️ Contribución directa: No se registra en el presupuesto');
      }

      // Preparar respuesta
      const response = { 
        message: 'Abono registrado exitosamente',
        newProgress,
        isCompleted: newProgress >= goal.target_amount,
        isDirectContribution
      };
      console.log('📤 Enviando respuesta al cliente:', response);
      
      res.json(response);
      console.log('✅ Respuesta enviada exitosamente');
    } catch (error) {
      console.error('❌ Error detallado:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        message: 'Error en el servidor al registrar el abono.',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ message: 'Error inesperado. Por favor, intenta de nuevo.' });
  }
}); 

// Eliminar una meta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { reason } = req.body; // Get the reason from the request body

    // Start a transaction
    await pool.query('START TRANSACTION');

    // 1. Fetch the goal to be deleted
    const [goals] = await pool.query(
      'SELECT id, user_id, progress FROM goals WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (goals.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    const goal = goals[0];
    const progressAmount = parseFloat(goal.progress || 0);

    // 2. Add the progress amount back to the user's balance
    if (progressAmount > 0) {
      // Check if deletion_reason column exists, create if not
      try {
        await pool.query('ALTER TABLE goals ADD COLUMN deletion_reason TEXT;');
        console.log('Added deletion_reason column to goals table.');
      } catch (alterError) {
        // Ignore error if column already exists (e.g., ER_DUP_FIELD_NAME)
        if (alterError.code !== 'ER_DUP_FIELDNAME') {
          console.error('Error adding deletion_reason column:', alterError);
          throw alterError; // Rethrow if it's a different error
        }
      }

      await pool.query(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [progressAmount, userId]
      );
    }

    // 3. Delete the goal and store the reason
    await pool.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]);

    // Commit the transaction
    await pool.query('COMMIT');

    res.json({ message: 'Meta eliminada exitosamente y progreso devuelto al presupuesto' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error al eliminar meta:', error);
    res.status(500).json({ message: 'Error al eliminar la meta', error: error.message });
  }
});