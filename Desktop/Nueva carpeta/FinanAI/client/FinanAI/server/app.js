const scheduledTransactionsRouter = require('./routes/scheduled_transactions');
app.use('/api/scheduled-transactions', scheduledTransactionsRouter);

// Importar y ejecutar el cron job
require('./cron'); 