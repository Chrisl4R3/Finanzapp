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

// Configuración de CORS simplificada para desarrollo
const isProduction = process.env.NODE_ENV === 'production';

// En desarrollo, permitir cualquier origen para facilitar las pruebas
const allowedOrigins = isProduction 
  ? ['https://frontend-production-df22.up.railway.app']
  : ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'];

// Configuración de CORS mejorada
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir cualquier origen
    if (!isProduction) return callback(null, true);
    
    // En producción, verificar el origen
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Origen no permitido por CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Importante para permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Manejar preflight OPTIONS requests
app.options('*', cors(corsOptions));

// Middleware para agregar headers CORS a todas las respuestas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Solo establecer el header si el origen está permitido
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  }
  
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
const sessionStore = new MySQLStoreSession({
  clearExpired: true,
  checkExpirationInterval: 900000, // Verificar cada 15 minutos
  expiration: 86400000, // 1 día
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

// Trust first proxy (required for secure cookies with proxy like Railway)
app.set('trust proxy', 1);

// Configuración de sesión mejorada
const sessionConfig = {
  name: 'finanzapp_session',
  secret: process.env.SESSION_SECRET || 'your_very_secure_secret_key_123',
  store: sessionStore,
  resave: false, // No guardar la sesión si no se modifica
  saveUninitialized: false, // No guardar sesiones vacías
  proxy: true, // Confiar en el proxy inverso (Railway)
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 día en milisegundos
    httpOnly: true, // No accesible desde JavaScript
    secure: isProduction, // Solo HTTPS en producción
    sameSite: isProduction ? 'none' : 'lax',
    path: '/', // Accesible en todas las rutas
    // No especificar el dominio para permitir que el navegador lo maneje
  },
  rolling: true, // Renovar el tiempo de expiración en cada petición
  unset: 'destroy' // Destruir la sesión al cerrar el navegador
};

// Configuración específica para desarrollo
if (!isProduction) {
  console.log('Modo desarrollo: cookies configuradas para desarrollo local');
  // Deshabilitar secure en desarrollo para permitir HTTP
  sessionConfig.cookie.secure = false;
  // Usar 'lax' en desarrollo para evitar problemas con SameSite
  sessionConfig.cookie.sameSite = 'lax';
  // Mostrar más información de depuración
  console.log('Configuración de cookies en desarrollo:', {
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    path: sessionConfig.cookie.path
  });
}

app.use(session(sessionConfig));

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