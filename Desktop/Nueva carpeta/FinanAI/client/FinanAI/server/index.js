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

const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la sesión con MySQL
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

// Configuración de la sesión
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
      cookie: req.session?.cookie,
      headers: {
        origin: req.headers.origin,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        host: req.headers.host
      }
    });
  }
  next();
});

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://frontend-production-df22.up.railway.app',
  'https://backend-production-cf437.up.railway.app'
];

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin && !isProduction) return callback(null, true);
    
    // En producción, verificar el origen contra la lista de permitidos
    if (isProduction && origin && !allowedOrigins.includes(origin)) {
      console.warn(`Origen no permitido por CORS: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Permitir el origen
    return callback(null, true);
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
  const origin = req.headers.origin;
  
  // Establecer cabeceras CORS
  if (origin && (allowedOrigins.includes(origin) || !isProduction)) {
    res.header('Access-Control-Allow-Origin', origin);
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

// La configuración de sesión ya se aplicó anteriormente

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
