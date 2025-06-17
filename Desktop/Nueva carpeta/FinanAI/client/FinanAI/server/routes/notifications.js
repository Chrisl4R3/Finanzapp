import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Obtener notificaciones no leídas
router.get('/unread', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       AND is_read = FALSE 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [req.userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener notificaciones de un usuario
router.get('/:userId', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear notificación
router.post('/', async (req, res) => {
  try {
    const { user_id, message, type } = req.body;

    const [result] = await pool.query(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [user_id, message, type]
    );

    res.status(201).json({
      message: 'Notificación creada exitosamente',
      notificationId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Marcar notificación como leída
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Notificaciones inteligentes generadas en tiempo real
router.get('/auto', async (req, res) => {
  try {
    const userId = req.userId;
    // Obtener resumen financiero y estadísticas
    const [[summary]] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(AVG(CASE WHEN type = 'Income' THEN amount END), 0) as avg_income,
        COALESCE(AVG(CASE WHEN type = 'Expense' THEN amount END), 0) as avg_expense,
        COUNT(*) as total_transactions
      FROM transactions WHERE user_id = ?
    `, [userId]);

    // Gastos e ingresos del mes actual
    const [[monthStats]] = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as month_income,
        SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as month_expense
      FROM transactions
      WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
    `, [userId]);

    // Último ingreso
    const [[lastIncome]] = await pool.query(`
      SELECT MAX(date) as last_income_date FROM transactions WHERE user_id = ? AND type = 'Income'
    `, [userId]);

    // Metas completadas recientemente
    const [completedGoals] = await pool.query(`
      SELECT name FROM goals WHERE user_id = ? AND status = 'Completed' AND end_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `, [userId]);

    // Transacciones pequeñas
    const [[smallTxStats]] = await pool.query(`
      SELECT COUNT(*) as small_count FROM transactions WHERE user_id = ? AND amount < 200
    `, [userId]);

    const notifications = [];

    // 1. Promedio de ahorro bajo
    if (summary.avg_income < summary.avg_expense) {
      notifications.push({
        type: 'alert',
        message: 'Tu promedio de ahorro es bajo. Intenta aumentar tus ingresos o reducir tus gastos.'
      });
    }

    // 2. Gastos superan ingresos este mes
    if ((monthStats.month_expense || 0) > (monthStats.month_income || 0)) {
      notifications.push({
        type: 'warning',
        message: '¡Cuidado! Tus gastos superan tus ingresos este mes.'
      });
    }

    // 3. Meta financiera alcanzada
    if (completedGoals.length > 0) {
      notifications.push({
        type: 'success',
        message: `¡Felicidades! Has alcanzado la meta: ${completedGoals[0].name}`
      });
    }

    // 4. Muchas transacciones pequeñas
    if (summary.total_transactions > 20 && smallTxStats.small_count > 10) {
      notifications.push({
        type: 'info',
        message: 'Tienes muchas transacciones pequeñas. Considera agrupar gastos o revisar tus hábitos.'
      });
    }

    // 5. No hay ingresos en los últimos 15 días
    if (!lastIncome.last_income_date || new Date(lastIncome.last_income_date) < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)) {
      notifications.push({
        type: 'alert',
        message: 'No has registrado ingresos en los últimos 15 días.'
      });
    }

    // 6. Gasto alto en una sola categoría
    const [topCategory] = await pool.query(`
      SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'Expense' GROUP BY category ORDER BY total DESC LIMIT 1
    `, [userId]);
    if (topCategory.length > 0 && topCategory[0].total > (summary.total_expenses * 0.5)) {
      notifications.push({
        type: 'warning',
        message: `Más del 50% de tus gastos están en la categoría: ${topCategory[0].category}`
      });
    }

    // 7. No has registrado gastos en los últimos 7 días
    const [[lastExpense]] = await pool.query(`
      SELECT MAX(date) as last_expense_date FROM transactions WHERE user_id = ? AND type = 'Expense'
    `, [userId]);
    if (!lastExpense.last_expense_date || new Date(lastExpense.last_expense_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      notifications.push({
        type: 'info',
        message: 'No has registrado gastos en la última semana. ¿Todo bien con tus finanzas?'
      });
    }

    // 8. Tienes una meta activa sin progreso
    const [goalsNoProgress] = await pool.query(`
      SELECT name FROM goals WHERE user_id = ? AND status = 'Active' AND progress = 0
    `, [userId]);
    if (goalsNoProgress.length > 0) {
      notifications.push({
        type: 'info',
        message: `Tienes una meta activa sin progreso: ${goalsNoProgress[0].name}`
      });
    }

    // 9. Has hecho más de 3 abonos a metas este mes
    const [[goalContributions]] = await pool.query(`
      SELECT COUNT(*) as abonos FROM transactions WHERE user_id = ? AND goal_id IS NOT NULL AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
    `, [userId]);
    if (goalContributions.abonos > 3) {
      notifications.push({
        type: 'success',
        message: '¡Excelente! Has hecho varios abonos a tus metas este mes.'
      });
    }

    // 10. Tu saldo está por debajo de 0
    if (summary.balance < 0) {
      notifications.push({
        type: 'alert',
        message: '¡Atención! Tu saldo general está en negativo.'
      });
    }

    // 11. No has actualizado tus metas en más de 30 días
    const [oldGoals] = await pool.query(`
      SELECT name FROM goals WHERE user_id = ? AND updated_at < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) LIMIT 1
    `, [userId]);
    if (oldGoals.length > 0) {
      notifications.push({
        type: 'info',
        message: `No has actualizado la meta "${oldGoals[0].name}" en más de 30 días. ¡Revisa tu progreso!`
      });
    }

    // 12. Has recibido un ingreso grande (mayor al doble del promedio)
    const [[bigIncome]] = await pool.query(`
      SELECT amount, description FROM transactions WHERE user_id = ? AND type = 'Income' AND amount > 0 ORDER BY amount DESC LIMIT 1
    `, [userId]);
    if (bigIncome && summary.avg_income > 0 && bigIncome.amount > summary.avg_income * 2) {
      notifications.push({
        type: 'success',
        message: `¡Ingreso destacado! Recibiste un ingreso grande: ${bigIncome.description || 'Sin descripción'} (${bigIncome.amount})`
      });
    }

    // 13. Has gastado en una nueva categoría este mes
    const [newCategory] = await pool.query(`
      SELECT category FROM transactions WHERE user_id = ? AND type = 'Expense' AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m') AND category NOT IN (SELECT DISTINCT category FROM transactions WHERE user_id = ? AND type = 'Expense' AND DATE_FORMAT(date, '%Y-%m') < DATE_FORMAT(CURRENT_DATE(), '%Y-%m')) LIMIT 1
    `, [userId, userId]);
    if (newCategory.length > 0) {
      notifications.push({
        type: 'info',
        message: `Has gastado en una nueva categoría este mes: ${newCategory[0].category}`
      });
    }

    // 14. Has hecho menos de 3 transacciones este mes
    const [[txCountThisMonth]] = await pool.query(`
      SELECT COUNT(*) as count FROM transactions WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
    `, [userId]);
    if (txCountThisMonth.count < 3) {
      notifications.push({
        type: 'info',
        message: 'Este mes has registrado muy pocas transacciones. ¡No olvides llevar el control de tus finanzas!'
      });
    }

    // 15. Has retirado dinero de una meta recientemente
    const [[withdrawal]] = await pool.query(`
      SELECT description, date FROM transactions WHERE user_id = ? AND type = 'Income' AND description LIKE 'Devolución de meta eliminada%' AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY) LIMIT 1
    `, [userId]);
    if (withdrawal) {
      notifications.push({
        type: 'warning',
        message: 'Has retirado dinero de una meta recientemente. ¡Recuerda mantener el enfoque en tus objetivos!'
      });
    }

    // 16. Has alcanzado el 75% de una meta activa
    const [almostGoals] = await pool.query(`
      SELECT name, progress, target_amount FROM goals WHERE user_id = ? AND status = 'Active' AND progress >= 0.75 * target_amount LIMIT 1
    `, [userId]);
    if (almostGoals.length > 0) {
      notifications.push({
        type: 'success',
        message: `¡Vas muy bien! Has alcanzado el 75% de la meta: ${almostGoals[0].name}`
      });
    }

    // Si hay menos de 5, rellena con sugerencias generales
    while (notifications.length < 5) {
      notifications.push({
        type: 'info',
        message: 'Revisa tus finanzas y mantén tus metas al día.'
      });
    }

    res.json(notifications.slice(0, 5));
  } catch (error) {
    console.error('Error generando notificaciones inteligentes:', error);
    res.status(500).json({ message: 'Error generando notificaciones inteligentes' });
  }
});

export default router;
