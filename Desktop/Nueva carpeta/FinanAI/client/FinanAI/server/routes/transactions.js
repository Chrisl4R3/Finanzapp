import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const VALID_CATEGORIES = {
  Income: ['Salario', 'Regalo', 'Inversiones', 'Otros-Ingreso'],
  Expense: [
    'Alimentación',
    'Servicios',
    'Salud',
    'Vivienda',
    'Educación',
    'Transporte',
    'Ropa',
    'Seguros',
    'Mantenimiento',
    'Entretenimiento',
    'Pasatiempos',
    'Restaurantes',
    'Compras',
    'Viajes',
    'Otros-Gasto'
  ]
};

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const [transactions] = await pool.query(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC',
      [req.userId]
    );
    res.json(transactions);
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const [transactions] = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
       ORDER BY date DESC 
       LIMIT 5`,
      [req.userId]
    );
    console.log('Recent transactions:', transactions);
    res.json(transactions);
  } catch (error) {
    console.error('Error in recent transactions:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear nueva transacción
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      type,
      category,
      amount,
      date,
      description,
      payment_method,
      status = 'Completed',
      schedule = null,
      recurrence = '',
      is_scheduled = 0,
      end_date = null,
      parent_transaction_id = null,
      assignToGoal = false,
      goal_id = null
    } = req.body;

    // Validaciones básicas
    if (!type || !category || !amount || !date || !description || !payment_method) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Validar tipo
    if (!['Income', 'Expense', 'Scheduled'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de transacción inválido' });
    }

    // Validar categoría
    if (!assignToGoal && !VALID_CATEGORIES[type].includes(category)) {
      return res.status(400).json({ 
        message: `Categoría inválida para ${type}. Categorías válidas: ${VALID_CATEGORIES[type].join(', ')}` 
      });
    }

    // Validar método de pago
    const validPaymentMethods = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia Bancaria'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ 
        message: `Método de pago inválido. Métodos válidos: ${validPaymentMethods.join(', ')}` 
      });
    }

    // Si es una transacción asignada a meta, validar que la meta exista
    if (assignToGoal && goal_id) {
      const [goals] = await connection.query(
        'SELECT * FROM goals WHERE id = ? AND user_id = ?',
        [goal_id, req.userId]
      );

      if (goals.length === 0) {
        return res.status(404).json({ message: 'Meta no encontrada' });
      }

      const goal = goals[0];
      
      // Validar que no exceda el monto objetivo de la meta
      const [currentProgress] = await connection.query(
        'SELECT COALESCE(SUM(amount), 0) as current_amount FROM transactions WHERE goal_id = ?',
        [goal_id]
      );
      
      const totalAfterContribution = Number(currentProgress[0].current_amount) + Number(amount);
      if (totalAfterContribution > goal.target_amount) {
        return res.status(400).json({ 
          message: 'El monto excede el objetivo de la meta' 
        });
      }
    }

    // Insertar la transacción de ingreso
    const [incomeResult] = await connection.query(
      `INSERT INTO transactions 
       (user_id, type, category, amount, date, description, payment_method, 
        status, schedule, recurrence, is_scheduled, end_date, parent_transaction_id, goal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, type, category, amount, date, description, payment_method,
       status, schedule, recurrence, is_scheduled, end_date, parent_transaction_id, goal_id]
    );

    // Si es una transacción asignada a meta, crear automáticamente el gasto correspondiente
    if (assignToGoal && goal_id) {
      await connection.query(
        `INSERT INTO transactions 
         (user_id, type, category, amount, date, description, payment_method, 
          status, schedule, recurrence, is_scheduled, end_date, parent_transaction_id, goal_id)
         VALUES (?, 'Expense', 'Ahorro', ?, ?, ?, ?, 'Completed', NULL, '', 0, NULL, ?, ?)`,
        [req.userId, amount, date, `Aporte a meta: ${description}`, payment_method, incomeResult.insertId, goal_id]
      );

      // Actualizar el progreso de la meta
      await connection.query(
        'UPDATE goals SET current_amount = current_amount + ? WHERE id = ?',
        [amount, goal_id]
      );
    }

    await connection.commit();
    console.log('Transacción creada:', { id: incomeResult.insertId, ...req.body });
    res.status(201).json({
      message: 'Transacción creada exitosamente',
      transactionId: incomeResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear transacción:', error);
    res.status(500).json({ message: 'Error al crear la transacción: ' + error.message });
  } finally {
    connection.release();
  }
});

// Actualizar transacción
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      category,
      amount,
      date,
      description,
      payment_method,
      status
    } = req.body;

    // Validar tipo y categoría
    if (type && !['Income', 'Expense'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de transacción inválido' });
    }

    if (type && category && !VALID_CATEGORIES[type].includes(category)) {
      return res.status(400).json({ 
        message: `Categoría inválida para ${type}. Categorías válidas: ${VALID_CATEGORIES[type].join(', ')}` 
      });
    }

    await pool.query(
      `UPDATE transactions 
       SET type = ?, category = ?, amount = ?, date = ?, 
           description = ?, payment_method = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [type, category, amount, date, description, payment_method, status, id, req.userId]
    );

    res.json({ message: 'Transacción actualizada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar transacción
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Transacción eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener datos para el dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Obtener resumen financiero
    const [summary] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END), 0) as balance
      FROM transactions 
      WHERE user_id = ?
    `, [req.userId]);

    // Obtener gastos por categoría
    const [expensesByCategory] = await pool.query(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type = 'Expense'
      GROUP BY category
      ORDER BY total DESC
    `, [req.userId]);

    // Obtener tendencias mensuales (últimos 6 meses)
    const [monthlyTrends] = await pool.query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE user_id = ? 
      AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    `, [req.userId]);

    res.json({
      summary: summary[0],
      expensesByCategory,
      monthlyTrends
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ message: 'Error al obtener datos del dashboard' });
  }
});

// Obtener estadísticas detalladas
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = startDate && endDate 
      ? 'AND date BETWEEN ? AND ?' 
      : '';
    const dateParams = startDate && endDate 
      ? [req.userId, startDate, endDate] 
      : [req.userId];

    // Resumen general
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END), 0) as net_balance,
        COALESCE(AVG(CASE WHEN type = 'Expense' THEN amount END), 0) as average_expense,
        COALESCE(AVG(CASE WHEN type = 'Income' THEN amount END), 0) as average_income
      FROM transactions 
      WHERE user_id = ? ${dateFilter}
    `, dateParams);

    // Análisis por categoría
    const [categoryAnalysis] = await pool.query(`
      SELECT 
        type,
        category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY type, category
      ORDER BY type, total_amount DESC
    `, dateParams);

    // Tendencias mensuales
    const [monthlyTrends] = await pool.query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END) as net_balance
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    `, dateParams);

    // Análisis de métodos de pago
    const [paymentMethods] = await pool.query(`
      SELECT 
        payment_method,
        COUNT(*) as usage_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY payment_method
      ORDER BY usage_count DESC
    `, dateParams);

    // Días con más transacciones
    const [topDays] = await pool.query(`
      SELECT 
        DATE_FORMAT(date, '%W') as day_of_week,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ? ${dateFilter}
      GROUP BY DATE_FORMAT(date, '%W')
      ORDER BY transaction_count DESC
    `, dateParams);

    res.json({
      summary: summary[0],
      categoryAnalysis,
      monthlyTrends,
      paymentMethods,
      topDays
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

export default router; 