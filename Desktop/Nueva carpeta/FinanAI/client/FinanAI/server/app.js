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

// Configuración de CORS simplificada y robusta
const allowedOrigins = [
  'https://frontend-production-df22.up.railway.app',  // Frontend en Railway
  'http://localhost:3000',  // Para desarrollo local del frontend
  'http://localhost:5000'   // Para desarrollo local del backend
];

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
  maxAge: 86400 // 24 horas
};

// Middleware de CORS
app.use(cors(corsOptions));

// Manejar peticiones OPTIONS
app.options('*', cors(corsOptions));

// Middleware para asegurar que los headers CORS estén presentes en todas las respuestas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
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
  proxy: true, // Trust the reverse proxy (Railway)
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    httpOnly: true,
    secure: true, // Always true for cross-site cookies
    sameSite: 'none', // Required for cross-site cookies
    // No domain specified - let the browser handle it
  }
}));

// Trust first proxy (required for secure cookies with proxy like Railway)
app.set('trust proxy', 1);

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