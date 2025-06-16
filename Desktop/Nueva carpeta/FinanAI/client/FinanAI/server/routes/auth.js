import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();
const JWT_SECRET = 'tu_secreto_super_seguro'; // Usar la misma clave que en el middleware

// Registro
router.post('/register', async (req, res) => {
  try {
    const { cedula, name, email, password } = req.body;
    console.log('Datos recibidos:', { cedula, name, email }); // No logueamos la contraseña

    // Validar cédula
    const cedulaRegex = /^\d{3}-\d{7}-\d{1}$/;
    if (!cedulaRegex.test(cedula)) {
      console.log('Validación de cédula fallida');
      return res.status(400).json({ 
        message: 'La cédula debe tener el formato correcto (XXX-XXXXXXX-X)' 
      });
    }

    // Verificar si el usuario ya existe
    console.log('Verificando usuario existente...');
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE cedula = ? OR email = ?',
      [cedula, email]
    );
    console.log('Usuarios existentes encontrados:', existingUsers.length);

    if (existingUsers.length > 0) {
      console.log('Usuario ya existe');
      return res.status(400).json({ 
        message: 'La cédula o email ya están registrados' 
      });
    }

    // Hash de la contraseña
    console.log('Generando hash de contraseña...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    console.log('Intentando insertar nuevo usuario...');
    const [result] = await pool.query(
      'INSERT INTO users (cedula, name, email, password) VALUES (?, ?, ?, ?)',
      [cedula, name, email, hashedPassword]
    );
    console.log('Usuario insertado con ID:', result.insertId);

    // Generar token JWT
    const token = jwt.sign(
      { userId: result.insertId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId,
      token
    });
  } catch (error) {
    console.error('Error detallado:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;
    console.log('Intento de login con cédula:', cedula);
    
    // Validar entrada
    if (!cedula || !password) {
      console.log('Faltan credenciales');
      return res.status(400).json({
        success: false,
        error: 'auth/missing-credentials',
        message: 'Se requieren cédula y contraseña'
      });
    }

    // Buscar usuario
    console.log('Buscando usuario en la base de datos...');
    const [users] = await pool.query(
      'SELECT id, cedula, name, email, password FROM users WHERE cedula = ?',
      [cedula]
    );
    
    console.log('Usuarios encontrados:', users.length);

    if (users.length === 0) {
      console.log('No se encontró usuario con la cédula:', cedula);
      return res.status(401).json({ 
        success: false,
        error: 'auth/user-not-found',
        message: 'No existe un usuario con esta cédula' 
      });
    }

    const user = users[0];
    console.log('Usuario encontrado:', { 
      id: user.id, 
      cedula: user.cedula,
      email: user.email
    });

    // Verificar contraseña
    console.log('Verificando contraseña...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Contraseña válida:', validPassword);
    
    if (!validPassword) {
      console.log('Contraseña incorrecta para el usuario:', cedula);
      return res.status(401).json({
        success: false,
        error: 'auth/wrong-password',
        message: 'Contraseña incorrecta'
      });
    }
    
    // Crear objeto de usuario para la sesión
    const userData = {
      id: user.id,
      cedula: user.cedula,
      name: user.name || 'Usuario',
      email: user.email
    };
    
    // Configurar la sesión
    req.session.user = userData;
    
    // Configurar opciones de cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
      path: '/',
      ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN && {
        domain: process.env.COOKIE_DOMAIN
      })
    };
    
    console.log('Configurando cookies con opciones:', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain || 'No definido'
    });
    
    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, cedula: user.cedula },
      process.env.JWT_SECRET || 'tu_secreto_super_seguro',
      { expiresIn: '7d' }
    );
    
    // Guardar la sesión
    req.session.save(err => {
      if (err) {
        console.error('Error al guardar la sesión:', err);
        return res.status(500).json({
          success: false,
          error: 'session/save-error',
          message: 'Error al iniciar sesión'
        });
      }
      
      console.log('Sesión guardada exitosamente para el usuario:', user.cedula);
      
      // Establecer la cookie de sesión
      res.cookie('finanzapp_session', req.sessionID, cookieOptions);
      
      // Enviar respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: userData,
        token,
        sessionId: req.sessionID
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Verificar sesión
router.get('/verify', async (req, res) => {
  try {
    console.log('=== Verificando sesión ===');
    console.log('Cookies recibidas:', req.headers.cookie);
    console.log('Sesión actual:', req.session);
    
    // Verificar si hay una sesión activa
    if (req.session && req.session.user) {
      console.log('Sesión activa encontrada para el usuario:', req.session.user.cedula);
      return res.status(200).json({ 
        success: true,
        user: req.session.user,
        isAuthenticated: true,
        message: 'Sesión activa',
        sessionId: req.sessionID
      });
    }

    // Si no hay sesión, verificar el token JWT
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No se encontró token de autenticación');
      return res.status(200).json({ 
        success: true,
        isAuthenticated: false,
        message: 'No autenticado' 
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token JWT encontrado, verificando...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_super_seguro');
      console.log('Token JWT válido para el usuario ID:', decoded.userId);
      
      // Verificar si el usuario existe en la base de datos
      const [results] = await pool.query(
        'SELECT id, cedula, name, email FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      if (!results || results.length === 0) {
        console.log('Usuario no encontrado en la base de datos');
        return res.status(200).json({ 
          success: true,
          isAuthenticated: false,
          message: 'Usuario no encontrado' 
        });
      }
      
      const userData = results[0];
      console.log('Usuario encontrado en la base de datos:', userData.cedula);
      
      // Crear sesión para futuras solicitudes
      req.session.user = userData;
      
      // Guardar la sesión
      req.session.save(err => {
        if (err) {
          console.error('Error al guardar la sesión:', err);
          return res.status(500).json({
            success: false,
            message: 'Error al verificar la sesión'
          });
        }
        
        console.log('Sesión restaurada exitosamente para el usuario:', userData.cedula);
        
        // Configurar opciones de cookies
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
          path: '/',
          ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN && {
            domain: process.env.COOKIE_DOMAIN
          })
        };
        
        // Establecer la cookie de sesión
        res.cookie('finanzapp_session', req.sessionID, cookieOptions);
        
        res.status(200).json({ 
          success: true,
          user: userData,
          isAuthenticated: true,
          message: 'Sesión restaurada con éxito',
          sessionId: req.sessionID
        });
      });
    } catch (tokenError) {
      console.error('Error al verificar el token:', tokenError);
      return res.status(200).json({ 
        success: true,
        isAuthenticated: false,
        message: 'La sesión ha expirado, por favor inicia sesión nuevamente' 
      });
    }
  } catch (error) {
    console.error('Error en la verificación de sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar la sesión'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      const sessionId = req.sessionID;
      const userId = req.session.user?.id;
      
      console.log(`Cerrando sesión para el usuario ID: ${userId}, Sesión ID: ${sessionId}`);
      
      // Destruir la sesión
      req.session.destroy(err => {
        if (err) {
          console.error('Error al destruir la sesión:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error al cerrar sesión' 
          });
        }
        
        // Configurar opciones para limpiar la cookie
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
          ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN && {
            domain: process.env.COOKIE_DOMAIN
          })
        };
        
        // Limpiar la cookie de sesión
        res.clearCookie('finanzapp_session', cookieOptions);
        
        console.log(`Sesión cerrada exitosamente para el usuario ID: ${userId}`);
        
        res.status(200).json({ 
          success: true, 
          message: 'Sesión cerrada exitosamente' 
        });
      });
    } else {
      console.log('Intento de cierre de sesión sin sesión activa');
      res.status(200).json({ 
        success: true, 
        message: 'No hay sesión activa' 
      });
    }
  } catch (error) {
    console.error('Error en el cierre de sesión:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la solicitud de cierre de sesión' 
    });
  }
});

export default router;
