import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  console.log('=== Verificando Token ===');
  console.log('URL:', req.method, req.originalUrl);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('❌ No se encontró el header de autorización');
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ No se encontró el token en el header de autorización');
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  try {
    console.log('🔍 Verificando token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, 'tu_secreto_jwt');
    console.log('✅ Token decodificado:', decoded);
    
    if (!decoded.userId) {
      console.log('❌ No se encontró userId en el token decodificado');
      return res.status(401).json({ message: 'Token inválido: no contiene userId' });
    }

    req.userId = decoded.userId;
    console.log('✅ userId establecido en el request:', req.userId);
    console.log('=== Verificación Completada ===\n');
    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
};
