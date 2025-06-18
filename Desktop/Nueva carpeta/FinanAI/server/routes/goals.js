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

    // Validar que el monto sea un número válido
    if (!amount || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      console.log('❌ Monto inválido:', amount);
      return res.status(400).json({ 
        message: 'El monto debe ser un número válido y mayor a 0',
        error: 'Invalid amount' 
      });
    }

    console.log('🔍 Buscando meta...');
    // Verificar que la meta existe y pertenece al usuario
    const [goals] = await pool.query(
      'SELECT id, user_id, name, target_amount, progress, status FROM goals WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    console.log('Resultado búsqueda:', goals);

    if (goals.length === 0) {
      console.log('❌ Meta no encontrada o no pertenece al usuario');
      return res.status(404).json({ message: 'Meta no encontrada' });
    }

    const goal = goals[0];
    console.log('✅ Meta encontrada:', {
      id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount,
      progress: goal.progress,
      status: goal.status
    });

    // Asegurarse de que los valores numéricos sean válidos
    const currentProgress = parseFloat(goal.progress || '0');
    const targetAmount = parseFloat(goal.target_amount || '0');
    const newProgress = currentProgress + parseFloat(amount);
    console.log('Valores numéricos:', {
      currentProgress,
      targetAmount,
      amount,
      newProgress
    });

    // Nueva validación: solo rechazar si el abono es mayor al objetivo total
    if (parseFloat(amount) > parseFloat(goal.target_amount)) {
      return res.status(400).json({ message: `El monto no puede ser mayor al objetivo de la meta (${goal.target_amount})` });
    }
    
    try {
      // Redondear newProgress a dos decimales para ajustarse al tipo decimal(10,2) de la BD
      newProgress = parseFloat(newProgress.toFixed(2));
      console.log('Valor de newProgress redondeado:', newProgress);

      // Actualizar el progreso de la meta
      console.log('📝 Actualizando progreso de la meta...');
      
      // Asegurarse de que el status sea uno de los valores válidos del ENUM
      const newStatus = newProgress >= parseFloat(goal.target_amount) ? 'Completed' : 'Active';
      console.log('Nuevo status:', newStatus);
      
      try {
        const [result] = await pool.query(
          'UPDATE goals SET progress = ?, status = ? WHERE id = ?',
          [newProgress, newStatus, id]
        );
        
        if (result.affectedRows === 0) {
          console.error('❌ No se actualizó ninguna fila');
          return res.status(404).json({ 
            message: 'No se encontró la meta para actualizar',
            error: 'No rows affected' 
          });
        }
        
        console.log('✅ Progreso actualizado');
      } catch (updateError) {
        console.error('❌ Error al actualizar la meta:', updateError);
        return res.status(500).json({ 
          message: 'Error al actualizar la meta',
          error: updateError.message 
        });
      }

      // Registrar la transacción para cualquier tipo de contribución
      console.log('📝 Registrando transacción en el presupuesto...');
      
      // Verificar que el goal.name existe antes de usarlo
      if (!goal.name) {
        console.error('❌ El nombre de la meta es undefined:', goal);
        return res.status(500).json({ 
          message: 'Error: El nombre de la meta es inválido',
          error: 'goal.name is undefined' 
        });
      }

      const transactionData = {
        userId,
        type: 'Income',
        category: 'Otros-Ingreso',
        amount,
        description: `Abono a meta: ${goal.name}`,
        payment_method: paymentMethod || 'Efectivo',
        status: 'Completed',
        date: new Date(),
        goal_id: id
      };
      console.log('Datos de la transacción:', transactionData);

      try {
        const [transactionResult] = await pool.query(
          'INSERT INTO transactions (user_id, type, category, amount, description, payment_method, status, date, goal_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [
            userId,
            'Income',
            'Otros-Ingreso',
            amount,
            `Abono a meta: ${goal.name}`,
            paymentMethod || 'Efectivo',
            'Completed',
            new Date().toISOString().slice(0, 19).replace('T', ' '),
            id
          ]
        );
        console.log('✅ Transacción registrada con ID:', transactionResult.insertId);
      } catch (txError) {
        console.error('❌ Error al registrar transacción:', txError);
        return res.status(500).json({ 
          message: 'Error al registrar la transacción',
          error: txError.message 
        });
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