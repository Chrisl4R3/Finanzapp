import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Obtener todas las metas del usuario
router.get('/', async (req, res) => {
  console.log('GET /goals - Obteniendo todas las metas para el usuario:', req.userId);
  try {
    const [goals] = await pool.query(
      'SELECT id, name, target_amount, progress, end_date, type, status FROM goals WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    console.log('Metas encontradas:', goals.length);
    res.json(goals);
  } catch (error) {
    console.error('Error al obtener metas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener metas activas
router.get('/active', async (req, res) => {
  console.log('GET /goals/active - Obteniendo metas activas para el usuario:', req.userId);
  try {
    const [goals] = await pool.query(
      `SELECT * FROM goals 
       WHERE user_id = ? 
       AND status = 'Active' 
       ORDER BY end_date ASC 
       LIMIT 3`,
      [req.userId]
    );
    console.log('Metas activas encontradas:', goals.length);
    res.json(goals);
  } catch (error) {
    console.error('Error al obtener metas activas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear nueva meta
router.post('/', async (req, res) => {
  console.log('POST /goals - Creando nueva meta para el usuario:', req.userId);
  console.log('Datos recibidos:', req.body);
  
  const { userId } = req;
  const {
    name,
    target_amount,
    end_date,
    type,
    progress = 0.00,
    payment_schedule = null,
    status = 'Active'
  } = req.body;

  if (!name || !target_amount || !type) {
    console.log('Datos faltantes:', { name, target_amount, type });
    return res.status(400).json({ message: 'Nombre, monto objetivo y tipo son requeridos.' });
  }

  if (!['Saving', 'Spending Reduction'].includes(type)) {
    console.log('Tipo inválido:', type);
    return res.status(400).json({ message: "Tipo de meta inválido. Debe ser 'Saving' o 'Spending Reduction'." });
  }

  if (status && !['Active', 'Completed'].includes(status)) {
    console.log('Estado inválido:', status);
    return res.status(400).json({ message: "Estado inválido. Debe ser 'Active' o 'Completed'." });
  }
  
  try {
    const [result] = await pool.query(
      'INSERT INTO goals (user_id, name, target_amount, end_date, type, progress, payment_schedule, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, target_amount, end_date, type, progress, payment_schedule ? JSON.stringify(payment_schedule) : null, status]
    );
    console.log('Meta creada con ID:', result.insertId);
    res.status(201).json({ id: result.insertId, userId, name, target_amount, end_date, type, progress, payment_schedule, status });
  } catch (error) {
    console.error('Error al crear meta:', error);
    res.status(500).json({ message: 'Error en el servidor al crear la meta.' });
  }
});

// Abonar a una meta
router.post('/:id/contribute', async (req, res) => {
  try {
    console.log('\n=== Iniciando contribución a meta ===');
    console.log('Parámetros:', req.params);
    console.log('Body:', req.body);
    console.log('Usuario:', req.userId);

    const { id } = req.params;
    const { amount } = req.body;
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

      // Registrar la transacción
      console.log('📝 Registrando transacción...');
      const transactionData = {
        userId,
        type: 'Expense',
        category: 'Otros-Gasto',
        amount,
        description: `Abono a meta: ${goal.name}`,
        payment_method: 'Efectivo',
        status: 'Completed',
        date: new Date(),
        goal_id: goal.id
      };
      console.log('Datos de la transacción:', transactionData);

      const [transactionResult] = await pool.query(
        'INSERT INTO transactions (user_id, type, category, amount, description, payment_method, status, date, goal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          'Expense',
          'Otros-Gasto',
          amount,
          `Abono a meta: ${goal.name}`,
          'Efectivo',
          'Completed',
          new Date(),
          goal.id
        ]
      );
      console.log('✅ Transacción registrada con ID:', transactionResult.insertId);

      // Preparar respuesta
      const response = { 
        message: 'Abono registrado exitosamente',
        newProgress,
        isCompleted: newProgress >= goal.target_amount,
        transactionId: transactionResult.insertId
      };
      console.log('📤 Enviando respuesta al cliente:', response);
      
      res.json(response);
      console.log('✅ Respuesta enviada exitosamente');
      return;
    } catch (error) {
      console.error('❌ Error detallado:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        message: 'Error en el servidor al registrar el abono.',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('❌ Error en el proceso principal:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Error en el servidor al registrar el abono.',
      error: error.message 
    });
  }
  console.log('=== Fin de la operación ===\n');
});

// Actualizar progreso de meta
router.put('/:id/progress', async (req, res) => {
  console.log('PUT /goals/:id/progress - Actualizando progreso de meta:', req.params.id);
  console.log('Nuevo progreso:', req.body.progress);
  try {
    const { id } = req.params;
    const { progress } = req.body;

    await pool.query(
      'UPDATE goals SET progress = ? WHERE id = ?',
      [progress, id]
    );
    console.log('Progreso actualizado exitosamente');
    res.json({ message: 'Progreso actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar meta
router.delete('/:id', async (req, res) => {
  console.log('DELETE /goals/:id - Eliminando meta:', req.params.id);
  const { userId } = req;
  let { id } = req.params;
  // Limpiar el ID en caso de que venga como '22:1' u otro formato incorrecto
  if (typeof id === 'string') {
    id = id.split(':')[0];
  }
  id = Number(id);
  console.log('ID limpio recibido para eliminar:', id, 'Tipo:', typeof id);

  try {
    // 1. Obtener la meta y su progreso
    const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [id, userId]);
    if (goals.length === 0) {
      console.log('Meta no encontrada o no pertenece al usuario');
      return res.status(404).json({ message: 'Meta no encontrada o no pertenece al usuario.' });
    }
    const goal = goals[0];
    const progress = parseFloat(goal.progress || 0);

    // 2. Si hay progreso, crear transacción de devolución
    if (progress > 0) {
      await pool.query(
        `INSERT INTO transactions (user_id, type, category, amount, date, description, payment_method, status, goal_id, recurrence, schedule, is_scheduled, end_date, parent_transaction_id) VALUES (?, 'Income', 'Otros-Ingreso', ?, NOW(), ?, 'Efectivo', 'Completed', NULL, '', NULL, 0, NULL, NULL)`,
        [userId, progress, `Devolución de meta eliminada: ${goal.name}`]
      );
      console.log('Transacción de devolución creada por', progress);
    }

    // 3. Eliminar la meta
    const [result] = await pool.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) {
      console.log('Meta no encontrada o no pertenece al usuario (tras verificación)');
      return res.status(404).json({ message: 'Meta no encontrada o no pertenece al usuario.' });
    }
    console.log('Meta eliminada exitosamente');
    res.status(200).json({ message: 'Meta eliminada exitosamente. El dinero fue devuelto al presupuesto principal.' });
  } catch (error) {
    console.error('Error al eliminar meta:', error);
    res.status(500).json({ message: 'Error en el servidor al eliminar la meta.' });
  }
});

export default router;
