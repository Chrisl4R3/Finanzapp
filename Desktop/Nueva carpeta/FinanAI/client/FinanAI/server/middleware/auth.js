import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  console.log('=== Verificando Sesión ===');
  console.log('URL:', req.method, req.originalUrl);
  
  if (!req.session || !req.session.user) {
    console.log('❌ No hay sesión activa');
    return res.status(401).json({ message: 'No hay sesión activa' });
  }

  console.log('✅ Sesión válida para el usuario:', req.session.user.id);
  req.userId = req.session.user.id;
  console.log('=== Verificación Completada ===\n');
  next();
};
