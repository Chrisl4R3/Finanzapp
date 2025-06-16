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

// Configuración de CORS mejorada
const isProduction = process.env.NODE_ENV === 'production';

// Orígenes permitidos
const allowedOrigins = [
  'https://frontend-production-df22.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista de permitidos o si estamos en desarrollo
    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      return callback(null, true);
    }
    
    console.warn(`Origen no permitido por CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Authorization', 'Set-Cookie'],
  maxAge: 86400, // 24 horas
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Configuración de cabeceras CORS
app.use((req, res, next) => {
  // Obtener el origen de la solicitud
  const requestOrigin = req.headers.origin;
  
  // Establecer cabeceras CORS
  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || !isProduction)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range, Authorization, Set-Cookie');
  }
  
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Configuración de trust proxy para manejar correctamente las cookies en producción
app.set('trust proxy', 1);

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
  secret: process.env.SESSION_SECRET || 'tu_clave_secreta_muy_segura_123',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Importante para Railway
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
    httpOnly: true,
    secure: isProduction, // true en producción (HTTPS), false en desarrollo
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // No establecer el dominio en desarrollo
    ...(isProduction && { domain: '.up.railway.app' }) // Solo en producción
  },
  rolling: true, // Renovar la cookie en cada petición
  unset: 'destroy'
};

// Configuración específica para desarrollo
if (!isProduction) {
  console.log('⚠️  Modo desarrollo: configurando cookies para desarrollo local');
  sessionConfig.cookie.sameSite = 'lax';
  
  // Mostrar configuración de cookies
  console.log('🔧 Configuración de cookies en desarrollo:', {
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    path: sessionConfig.cookie.path,
    domain: sessionConfig.cookie.domain || 'localhost'
  });
} else {
  console.log('🚀 Modo producción: configurando cookies seguras para producción');
  console.log('🔒 Configuración de cookies en producción:', {
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    path: sessionConfig.cookie.path,
    domain: sessionConfig.cookie.domain
  });
}

// Aplicar el middleware de sesión después de la configuración
app.use(session(sessionConfig));

// Middleware para verificar la configuración de cookies
app.use((req, res, next) => {
  // Solo para depuración - no usar en producción
  if (!isProduction) {
    console.log('🔍 Información de la sesión:', {
      sessionId: req.sessionID,
      cookie: req.session.cookie,
      headers: {
        origin: req.headers.origin,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        host: req.headers.host
      }
    });
  }
  next();
});

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