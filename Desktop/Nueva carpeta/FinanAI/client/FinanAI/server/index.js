import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import scheduledTransactionsRoutes from './routes/scheduled_transactions.js';
import goalRoutes from './routes/goals.js';
import notificationRoutes from './routes/notifications.js';
import pool from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la sesión con MySQL
const MySQLStoreSession = MySQLStore(session);
const sessionStore = new MySQLStoreSession({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

// Configuración de CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://frontend-production-df22.up.railway.app',
    'https://backend-production-cf437.up.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware de sesión
app.use(session({
  key: 'finanzapp_session',
  secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Middleware para parsear JSON
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('Cookies:', req.cookies);
  next();
});

// Ruta de estado del servidor
app.get('/', (req, res) => {
  const serverInfo = {
    status: 'online',
    timestamp: new Date().toISOString(),
    message: '¡Servidor FinanAI funcionando correctamente!',
    endpoints: [
      '/api/auth',
      '/api/transactions',
      '/api/scheduled-transactions',
      '/api/goals',
      '/api/notifications'
    ]
  };
  res.json(serverInfo);
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/scheduled-transactions', scheduledTransactionsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  console.log('Rutas disponibles:');
  console.log('- /api/auth');
  console.log('- /api/transactions');
  console.log('- /api/scheduled-transactions');
  console.log('- /api/goals');
  console.log('- /api/notifications');
});
