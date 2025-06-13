import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import transactionsRouter from './routes/transactions.js';
import scheduledTransactionsRouter from './routes/scheduled_transactions.js';
import authRouter from './routes/auth.js';
import goalsRouter from './routes/goals.js';
import notificationsRouter from './routes/notifications.js';
import pool from './config/db.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de CORS más robusta
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir el frontend de Railway
    if (origin === 'https://frontend-production-df22.up.railway.app' || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Content-Type-Options'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  // Configuración adicional para Railway
  allowedOrigins: ['https://frontend-production-df22.up.railway.app'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Content-Type-Options'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
  credentials: true
};

// Middleware de CORS
app.use(cors(corsOptions));

// Middleware adicional para Railway
app.use((req, res, next) => {
  // Manejo de preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'https://frontend-production-df22.up.railway.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '600');
    res.status(204).end();
    return;
  }

  // Headers para peticiones normales
  res.header('Access-Control-Allow-Origin', 'https://frontend-production-df22.up.railway.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Authorization');
  
  next();
});

// Configuración de cache
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});

// Compresión de respuestas
app.use(compression());

// Actualizar la configuración de CORS existente
corsOptions.methods.push('PATCH');
corsOptions.allowedHeaders.push('X-Requested-With');
corsOptions.exposedHeaders.push('Content-Range', 'X-Content-Range');
corsOptions.maxAge = 600;

// Middleware de CORS
app.use(cors(corsOptions));

// Manejar peticiones OPTIONS
app.options('*', cors(corsOptions));

// Middleware adicional para Railway
app.use((req, res, next) => {
  // Asegurar que las peticiones OPTIONS se manejen correctamente
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'https://frontend-production-df22.up.railway.app');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.status(204).end();
    return;
  }
  next();
});

// Middleware para parsear JSON
app.use(express.json());

// Configuración de sesión
const MySQLStoreSession = MySQLStore(session);
const sessionStore = new MySQLStoreSession({}, pool);

app.use(session({
  key: 'finanzapp_session',
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.up.railway.app' : undefined
  }
}));

// Rutas
app.use('/api/transactions', transactionsRouter);
app.use('/api/scheduled-transactions', scheduledTransactionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/notifications', notificationsRouter);

// Endpoint temporal para probar CORS
app.get('/cors-test', (req, res) => {
  res.json({ message: 'CORS funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

export default app; 