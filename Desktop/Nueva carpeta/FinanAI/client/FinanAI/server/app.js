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