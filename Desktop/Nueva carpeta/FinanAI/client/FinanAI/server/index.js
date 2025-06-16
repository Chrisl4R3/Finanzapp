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

// Configuración de entorno
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Configuración de CORS - Lista de orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://frontend-production-df22.up.railway.app',
  'https://backend-production-cf437.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173' // Añadido para desarrollo con Vite
].filter(Boolean);

// Mostrar configuración al iniciar
console.log('=== Configuración del Servidor en Railway ===');
console.log('Entorno:', isProduction ? 'PRODUCCIÓN' : 'desarrollo');
console.log('URL del Frontend:', process.env.FRONTEND_URL || 'No definida');
console.log('URL del Backend:', process.env.BACKEND_URL || 'No definida');
console.log('Orígenes permitidos:', allowedOrigins.length > 0 ? allowedOrigins : 'Ninguno definido');
console.log('Dominio de cookies:', process.env.COOKIE_DOMAIN || 'No definido');
console.log('Cookies seguras:', process.env.COOKIE_SECURE === 'true' ? 'Sí' : 'No');
console.log('===========================================');

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
    httpOnly: process.env.COOKIE_HTTPONLY === 'true',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    path: '/',
    // Configuración de dominio
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
  },
  rolling: true, // Renovar la cookie en cada petición
  unset: 'destroy',
  // Configuración de regeneración de ID de sesión
  genid: async function() {
    const crypto = await import('crypto');
    return crypto.randomBytes(16).toString('hex');
  }
};

// Configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    // En desarrollo, permitir todos los orígenes
    if (!isProduction) {
      console.log(`Permitiendo origen (modo desarrollo): ${origin}`);
      return callback(null, true);
    }
    
    // En producción, verificar contra la lista de orígenes permitidos
    if (allowedOrigins.includes(origin)) {
      console.log(`Origen permitido: ${origin}`);
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
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Range', 
    'X-Content-Range', 
    'Authorization', 
    'Set-Cookie',
    'Access-Control-Allow-Credentials'
  ]
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar preflight para todas las rutas

// Middleware para asegurar que las cookies se envíen correctamente
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
  
  // Solo para desarrollo
  if (!isProduction) {
    req.session.cookie.secure = false;
    req.session.cookie.sameSite = 'lax';
  }
  next();
});

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

// Configuración de sesión y middlewares
app.set('trust proxy', 1); // Confiar en el primer proxy

// Middleware para manejar encabezados de proxy
app.use((req, res, next) => {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Middleware de rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Configuración de cabeceras CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Establecer cabeceras CORS
  if (origin) {
    if (allowedOrigins.includes(origin) || !isProduction) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
      res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range, Authorization, Set-Cookie, Access-Control-Allow-Credentials');
      
      // Manejar solicitudes OPTIONS (preflight)
      if (req.method === 'OPTIONS') {
        console.log('Manejando solicitud OPTIONS (preflight)');
        return res.status(200).end();
      }
    } else {
      console.warn(`Intento de acceso desde origen no permitido: ${origin}`);
      return res.status(403).json({ error: 'Origen no permitido' });
    }
  }
  
  next();
});

// Middleware para debug de CORS
app.use((req, res, next) => {
  console.log('=== CORS Headers ===');
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
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
