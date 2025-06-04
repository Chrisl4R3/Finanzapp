import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Obtener todas las transacciones programadas
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE user_id = ? ORDER BY next_execution ASC',
      [req.session.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener transacciones programadas:', error);
    res.status(500).json({ message: 'Error al obtener las transacciones programadas' });
  }
});

// Crear una nueva transacción programada
router.post('/', async (req, res) => {
  try {
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

    // Calcular next_execution basado en start_date
    const next_execution = new Date(start_date);

    const [result] = await pool.query(
      `INSERT INTO scheduled_transactions 
       (user_id, description, amount, type, category, payment_method, 
        frequency, start_date, end_date, next_execution) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, description, amount, type, category, payment_method, 
       frequency, start_date, end_date, next_execution]
    );

    const [newTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newTransaction[0]);
  } catch (error) {
    console.error('Error al crear transacción programada:', error);
    res.status(500).json({ message: 'Error al crear la transacción programada' });
  }
});

// Actualizar una transacción programada
router.put('/:id', async (req, res) => {
  try {
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

    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.session.user.id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    // Actualizar next_execution si se cambia la frecuencia o start_date
    const next_execution = new Date(start_date);

    const [result] = await pool.query(
      `UPDATE scheduled_transactions 
       SET description = ?, amount = ?, type = ?, category = ?, 
           payment_method = ?, frequency = ?, start_date = ?, 
           end_date = ?, status = ?, next_execution = ?
       WHERE id = ? AND user_id = ?`,
      [description, amount, type, category, payment_method, frequency,
       start_date, end_date, status, next_execution, id, req.session.user.id]
    );

    const [updatedTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [id]
    );

    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error('Error al actualizar transacción programada:', error);
    res.status(500).json({ message: 'Error al actualizar la transacción programada' });
  }
});

// Eliminar una transacción programada
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.session.user.id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    await pool.query(
      'DELETE FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.session.user.id]
    );

    res.json({ message: 'Transacción programada eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar transacción programada:', error);
    res.status(500).json({ message: 'Error al eliminar la transacción programada' });
  }
});

// Cambiar estado de transacción programada (Activar/Pausar)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Verificar que la transacción pertenece al usuario
    const [transaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ? AND user_id = ?',
      [id, req.session.user.id]
    );

    if (transaction.length === 0) {
      return res.status(404).json({ message: 'Transacción programada no encontrada' });
    }

    await pool.query(
      'UPDATE scheduled_transactions SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, req.session.user.id]
    );

    const [updatedTransaction] = await pool.query(
      'SELECT * FROM scheduled_transactions WHERE id = ?',
      [id]
    );

    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error('Error al actualizar estado de transacción programada:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de la transacción programada' });
  }
});

export default router; 