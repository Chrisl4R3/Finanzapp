import express from 'express';
import cors from 'cors';
import session from 'express-session';
import crypto from 'crypto';
import MySQLStore from 'express-mysql-session';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import scheduledTransactionsRoutes from './routes/scheduled_transactions.js';
import goalRoutes from './routes/goals.js';
import notificationRoutes from './routes/notifications.js';
import pool from './config/db.js';

// Configuración de entorno
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Configuración de CORS - Orígenes permitidos
const allowedOrigins = [
  'https://frontend-production-df22.up.railway.app',
  'https://backend-production-cf437.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Si existe la variable de entorno, la usamos y añadimos a los orígenes permitidos
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS
    .split(',')
    .map(origin => origin.trim().replace(/;$/, ''))
    .filter(origin => !allowedOrigins.includes(origin));
  
  allowedOrigins.push(...additionalOrigins);
}

// Mostrar configuración al iniciar
console.log('=== Configuración del Servidor ===');
console.log('Entorno:', isProduction ? 'PRODUCCIÓN' : 'DESARROLLO');
console.log('Orígenes permitidos:', allowedOrigins.length > 0 ? allowedOrigins : 'Ninguno definido');
console.log('Dominio de cookies:', process.env.COOKIE_DOMAIN || 'No definido');
console.log('Cookies seguras:', process.env.COOKIE_SECURE === 'true' ? 'Sí' : 'No');
console.log('==================================');

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

// Configuración de CORS
// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    // En desarrollo, permitir cualquier origen
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Permitiendo origen (modo desarrollo): ${origin}`);
      return callback(null, true);
    }
    
    // En producción, verificar contra la lista de orígenes permitidos
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Origen no permitido: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'x-debug',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Range', 
    'X-Content-Range', 
    'Authorization', 
    'Set-Cookie',
    'Access-Control-Allow-Credentials'
  ],
  optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) se bloquean con 204
};

// Aplicar CORS
app.use(cors(corsOptions));

// Manejar preflight para todas las rutas
app.options('*', cors(corsOptions));

// Middleware para debug de CORS
app.use((req, res, next) => {
  console.log('=== CORS Headers ===');
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  next();
});

// Middleware de sesión
const sessionConfig = {
  key: 'finanzapp_session',
  secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Importante para Railway
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
    httpOnly: true,
    secure: isProduction, // Solo enviar sobre HTTPS en producción
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // Configuración de dominio para producción 
    ...(isProduction && process.env.COOKIE_DOMAIN && { 
      domain: process.env.COOKIE_DOMAIN 
    })
  },
  rolling: true, // Renovar la cookie en cada petición
  unset: 'destroy',
  // Configuración de regeneración de ID de sesión
  genid: function() {
 return crypto.randomBytes(16).toString('hex');
  }
};

// Configuración específica para desarrollo (aplicar después de la definición inicial de sessionConfig)
if (!isProduction) {
  console.log('⚠️  Modo desarrollo: configurando cookies para desarrollo local');
  sessionConfig.cookie.secure = false;
  sessionConfig.cookie.sameSite = 'lax';
  // En desarrollo, si no se define un dominio, usar 'localhost' para claridad en logs
  sessionConfig.cookie.domain = sessionConfig.cookie.domain || 'localhost';

  // Mostrar configuración de cookies
  console.log('🔧 Configuración de cookies en desarrollo:', {
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure, 
    sameSite: sessionConfig.cookie.sameSite, 
    path: sessionConfig.cookie.path, 
    domain: sessionConfig.cookie.domain,
  });
  console.log('🔒 Configuración de cookies en producción:', {
    httpOnly: sessionConfig.cookie.httpOnly,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    path: sessionConfig.cookie.path,
    domain: sessionConfig.cookie.domain || 'No definido'
  });
}

// Mostrar configuración de cookies después de aplicar la configuración de entorno
console.log('🔑 Configuración final de cookies:', {
  httpOnly: sessionConfig.cookie.httpOnly,
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  domain: sessionConfig.cookie.domain,
  maxAge: sessionConfig.cookie.maxAge,
  path: sessionConfig.cookie.path,
  proxy: sessionConfig.proxy
});

// Re-aplicar el middleware de sesión aquí para claridad, aunque ya se aplicó arriba.
// Es crucial que la configuración de sessionConfig se haya completado antes de esta línea.
app.use(session(sessionConfig));

// Configuración de confianza para proxies
app.set('trust proxy', 1); // Confiar en el primer proxy

// Middleware de parseo de JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para verificar la configuración de cookies (solo en desarrollo)
if (!isProduction) {
  app.use((req, res, next) => {
    console.log('🔍 Información de la solicitud:', {
      method: req.method,
      url: req.originalUrl,
      sessionId: req.sessionID,
      headers: {
        origin: req.headers.origin,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        host: req.headers.host,
        cookie: req.headers.cookie ? 'Presente' : 'No presente'
      },
      session: req.session ? 'Iniciada' : 'No iniciada',
      secure: req.secure ? 'Sí' : 'No'
    });
    next();
  });
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/scheduled-transactions', scheduledTransactionsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta de verificación de salud
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  
  // Manejar errores de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acceso no permitido por CORS',
      allowedOrigins: allowedOrigins
    });
  }
  
  // Manejar errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors
    });
  }
  
  // Error genérico del servidor
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Iniciar el servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`🔗 URL de la API: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
  console.log(`🔒 Orígenes permitidos: ${allowedOrigins.join(', ') || 'Ninguno'}`);
  console.log('===========================================\n');
});

// Manejar cierre del proceso
process.on('SIGTERM', () => {
  console.log('\n🔴 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

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

// Rutas con y sin prefijo /api para compatibilidad
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/scheduled-transactions', scheduledTransactionsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);

// Rutas sin prefijo /api para compatibilidad con el frontend existente
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/scheduled-transactions', scheduledTransactionsRoutes);
app.use('/goals', goalRoutes);
app.use('/notifications', notificationRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


