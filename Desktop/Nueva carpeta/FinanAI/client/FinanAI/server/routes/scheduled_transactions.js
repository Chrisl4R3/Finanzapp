const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Obtener todas las transacciones programadas del usuario
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM scheduled_transactions WHERE user_id = ? ORDER BY next_execution ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener transacciones programadas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear nueva transacción programada
router.post('/', async (req, res) => {
  const {
    description,
    amount,
    type,
    category,
    payment_method,
    frequency,
    start_date,
    end_date
  } = req.body;

  try {
    // Calcular next_execution basado en start_date
    const next_execution = new Date(start_date);

    const [result] = await pool.query(
      `INSERT INTO scheduled_transactions 
       (user_id, description, amount, type, category, payment_method, 
        frequency, start_date, end_date, next_execution) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, description, amount, type, category, payment_method, 
       frequency, start_date, end_date, next_execution]
    );

    const [newTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newTransaction[0]);
  } catch (error) {
    console.error('Error al crear transacción programada:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar transacción programada
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    description,
    amount,
    type,
    category,
    payment_method,
    frequency,
    start_date,
    end_date,
    status
  } = req.body;

  try {
    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    // Actualizar next_execution si se cambia la frecuencia o start_date
    const next_execution = new Date(start_date);

    await pool.query(
      `UPDATE scheduled_transactions 
       SET description = ?, amount = ?, type = ?, category = ?, 
           payment_method = ?, frequency = ?, start_date = ?, 
           end_date = ?, status = ?, next_execution = ?
       WHERE id = ? AND user_id = ?`,
      [description, amount, type, category, payment_method, frequency,
       start_date, end_date, status, next_execution, id, req.userId]
    );

    const [updatedTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [id]
    );

    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error('Error al actualizar transacción programada:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar transacción programada
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    await pool.query(
      'DELETE FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    res.json({ message: 'Transacción programada eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar transacción programada:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Cambiar estado de transacción programada (Activar/Pausar)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    await pool.query(
      'UPDATE scheduled_transactions SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, req.userId]
    );

    const [updatedTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [id]
    );

    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error('Error al actualizar estado de transacción programada:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router; 