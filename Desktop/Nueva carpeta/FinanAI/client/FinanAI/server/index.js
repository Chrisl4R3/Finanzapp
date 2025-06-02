import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import goalRoutes from './routes/goals.js';
import notificationRoutes from './routes/notifications.js';
import pool from './config/db.js';

const app = express();

// Configuración de CORS antes de cualquier otra configuración
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://frontend-production-df22.up.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Configuración de la sesión con MySQL
const MySQLStoreSession = MySQLStore(session);

const sessionStore = new MySQLStoreSession({
  clearExpired: true,
  checkExpirationInterval: 900000, // Cada 15 minutos
  expiration: 86400000, // 24 horas
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

// Middleware de sesión
app.use(session({
  key: 'finanzapp_session',
  secret: 'tu_secreto_super_seguro',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000, // 24 horas
    sameSite: 'none', // Importante para cookies entre dominios
    domain: process.env.NODE_ENV === 'production' ? '.railway.app' : undefined // Dominio para producción
  }
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Session:', req.session);
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
      '/api/goals',
      '/api/notifications'
    ]
  };
  res.json(serverInfo);
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('Rutas disponibles:');
  console.log('- /api/auth');
  console.log('- /api/transactions');
  console.log('- /api/goals');
  console.log('- /api/notifications');
});
