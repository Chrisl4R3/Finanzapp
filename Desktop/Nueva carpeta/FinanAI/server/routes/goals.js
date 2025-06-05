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

    const newProgress = parseFloat(goal.progress || 0) + parseFloat(amount);
    console.log('Nuevo progreso calculado:', newProgress);
    
    try {
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