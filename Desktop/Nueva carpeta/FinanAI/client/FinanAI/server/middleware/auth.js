import jwt from 'jsonwebtoken';

const JWT_SECRET = 'tu_secreto_super_seguro'; // Usar la misma clave que en la sesión

export const verifyToken = (req, res, next) => {
  console.log('=== Verificando Autenticación ===');
  console.log('URL:', req.method, req.originalUrl);
  
  // Primero intentamos verificar la sesión
  if (req.session && req.session.user) {
    console.log('✅ Sesión válida para el usuario:', req.session.user.id);
    req.userId = req.session.user.id;
    console.log('=== Verificación por Sesión Completada ===\n');
    return next();
  }

  // Si no hay sesión, verificamos el token JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
      console.log('✅ Token JWT válido para el usuario:', req.userId);
      console.log('=== Verificación por Token Completada ===\n');
      return next();
    } catch (error) {
      console.log('❌ Token JWT inválido:', error.message);
    }
  }

  // Si no hay sesión ni token válido
  console.log('❌ No hay autenticación válida');
  return res.status(401).json({ message: 'No hay autenticación válida' });
};
