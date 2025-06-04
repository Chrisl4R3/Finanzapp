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

// Middleware de sesión
app.use(session({
  key: 'finanzapp_session',
  secret: 'tu_secreto_super_seguro',
  store: sessionStore,
  resave: true,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false, // Cambiar a true en producción con HTTPS
    httpOnly: true,
    maxAge: 86400000,
    sameSite: 'lax'
  }
}));

// Configuración de CORS
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://frontend-production-df22.up.railway.app',
      'https://backend-production-cf437.up.railway.app',
      'https://finanzapp-production.up.railway.app'
    ];
    // Permitir solicitudes sin origin (como las de Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Origin bloqueado por CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

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
