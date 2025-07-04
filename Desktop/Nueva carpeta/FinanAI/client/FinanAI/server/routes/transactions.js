import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { getUserBalance } from '../utils/balance.js';

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

    // Validar saldo disponible si es un gasto
    if (type === 'Expense') {
      const currentBalance = await getUserBalance(req.userId);
      if (currentBalance < amount) {
        // Crear notificación
        await pool.query(
          'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
          [req.userId, `No tienes suficiente saldo para este gasto. Saldo actual: ${currentBalance}`, 'warning']
        );
        
        // Redirigir al usuario a la vista de saldo
        return res.status(400).json({
          message: 'Saldo insuficiente',
          currentBalance: currentBalance,
          redirect: '/dashboard/balance'
        });
      }
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
      
      // Validar que el abono individual no sea mayor al objetivo de la meta
      if (Number(amount) > goal.target_amount) {
        return res.status(400).json({ 
          message: `El monto no puede ser mayor al objetivo de la meta (${goal.target_amount})` 
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
         VALUES (?, 'Expense', 'Otros-Gasto', ?, ?, ?, ?, 'Completed', NULL, '', 0, NULL, ?, ?)`,
        [req.userId, amount, date, `Aporte a meta: ${description}`, payment_method, incomeResult.insertId, goal_id]
      );

      // Actualizar el progreso de la meta
      await connection.query(
        'UPDATE goals SET progress = progress + ? WHERE id = ?',
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

// Endpoint de prueba
router.get('/test', (req, res) => {
  console.log('✅ Prueba de conexión exitosa');
  res.json({
    status: 'success',
    message: '¡El endpoint de estadísticas está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Obtener estadísticas detalladas
router.get('/statistics', async (req, res) => {
  // Configurar manualmente los encabezados CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, cache-control');
  res.header('Access-Control-Allow-Credentials', true);
  
  // Responder inmediatamente a las solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  console.log('=== Inicio de la solicitud de estadísticas ===');
  console.log('Usuario ID:', req.userId);
  console.log('Query params:', req.query);
  
  const connection = await pool.getConnection();
  try {
    console.log('Conexión a la base de datos establecida');
    const { startDate, endDate } = req.query;
    console.log('Fechas recibidas - Inicio:', startDate, 'Fin:', endDate);
    
    // Validar fechas
    if (startDate && isNaN(new Date(startDate).getTime())) {
      throw new Error('Fecha de inicio inválida');
    }
    if (endDate && isNaN(new Date(endDate).getTime())) {
      throw new Error('Fecha de fin inválida');
    }
    
    const dateFilter = startDate && endDate 
      ? 'AND date BETWEEN ? AND ?' 
      : '';
    const dateParams = startDate && endDate 
      ? [req.userId, startDate, endDate] 
      : [req.userId];
      
    console.log('Filtro de fecha:', dateFilter);
    console.log('Parámetros de fecha:', dateParams);

    // Resumen general
    console.log('Ejecutando consulta de resumen general...');
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END), 0) as net_balance,
        COALESCE(AVG(CASE WHEN type = 'Expense' THEN amount END), 0) as average_expense,
        COALESCE(AVG(CASE WHEN type = 'Income' THEN amount END), 0) as average_income
      FROM transactions 
      WHERE user_id = ? ${dateFilter}
    `;
    console.log('Query de resumen:', summaryQuery);
    console.log('Parámetros:', dateParams);
    
    const [summary] = await connection.query(summaryQuery, dateParams);
    console.log('Resultado del resumen:', summary);

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

    const result = {
      summary: summary[0],
      categoryAnalysis: categoryAnalysis || [],
      monthlyTrends: monthlyTrends || [],
      paymentMethods: paymentMethods || [],
      topDays: topDays || []
    };
    
    console.log('Estadísticas generadas con éxito');
    console.log('Resumen:', result.summary);
    console.log('Categorías:', result.categoryAnalysis.length);
    console.log('Meses:', result.monthlyTrends.length);
    
    res.json(result);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    console.error('Stack trace:', error.stack);
    
    // Si hay un error de SQL, mostrarlo en la respuesta para depuración
    const errorResponse = {
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    };
    
    res.status(500).json(errorResponse);
  } finally {
    if (connection) {
      await connection.release();
      console.log('Conexión a la base de datos liberada');
    }
    console.log('=== Fin de la solicitud de estadísticas ===\n');
  }
});

// Agrupar transacciones por mes y filtrar por categoría
router.get('/grouped', async (req, res) => {
  try {
    const { category, type, month } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [req.userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (month) {
      query += " AND DATE_FORMAT(date, '%Y-%m') = ?";
      params.push(month);
    }
    query += ' ORDER BY date DESC';

    const [transactions] = await pool.query(query, params);

    // Agrupar por mes
    const grouped = {};
    transactions.forEach(tx => {
      const monthKey = tx.date ? tx.date.toISOString().slice(0, 7) : '';
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(tx);
    });
    const result = Object.entries(grouped).map(([month, transactions]) => ({ month, transactions }));
    // Ordenar por mes descendente
    result.sort((a, b) => b.month.localeCompare(a.month));
    res.json(result);
  } catch (error) {
    console.error('Error al agrupar transacciones:', error);
    res.status(500).json({ message: 'Error al agrupar transacciones' });
  }
});

export default router; 