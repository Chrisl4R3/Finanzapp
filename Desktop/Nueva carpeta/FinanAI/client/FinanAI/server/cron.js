const cron = require('node-cron');
const { executeScheduledTransactions } = require('./scripts/run_scheduled_transactions');

// Ejecutar el script todos los días a las 00:01
cron.schedule('1 0 * * *', async () => {
  console.log('Ejecutando transacciones programadas...');
  try {
    await executeScheduledTransactions();
    console.log('Transacciones programadas ejecutadas exitosamente');
  } catch (error) {
    console.error('Error al ejecutar transacciones programadas:', error);
  }
}); 