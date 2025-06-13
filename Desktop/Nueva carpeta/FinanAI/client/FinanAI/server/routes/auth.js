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
    console.log('Intento de login con:', { cedula }); // No logueamos la contraseña por seguridad

    // Buscar usuario
    const [users] = await pool.query(
      'SELECT * FROM users WHERE cedula = ?',
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
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Contraseña válida:', validPassword);

    if (!validPassword) {
      console.log('Contraseña incorrecta para el usuario:', user.cedula);
      return res.status(401).json({ 
        success: false,
        error: 'auth/wrong-password',
        message: 'Contraseña incorrecta' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        cedula: user.cedula,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Guardar en sesión
    const userData = {
      id: user.id,
      cedula: user.cedula,
      name: user.name || 'Usuario',
      email: user.email
    };

    req.session.user = userData;
    console.log('Sesión guardada:', req.session.user);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Verificar sesión
router.get('/verify', (req, res) => {
  // Primero verificar si hay una sesión activa
  if (req.session && req.session.user) {
    return res.json({ 
      user: req.session.user,
      isAuthenticated: true 
    });
  }

  // Si no hay sesión, verificar el token JWT
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Obtener datos del usuario desde la base de datos
      pool.query(
        'SELECT id, cedula, name, email FROM users WHERE id = ?',
        [decoded.userId],
        (error, results) => {
          if (error || results.length === 0) {
            return res.status(401).json({ 
              message: 'Token inválido',
              isAuthenticated: false 
            });
          }

          const user = results[0];
          return res.json({ 
            user,
            isAuthenticated: true 
          });
        }
      );
    } catch (error) {
      return res.status(401).json({ 
        message: 'Token inválido',
        isAuthenticated: false 
      });
    }
  } else {
    res.status(401).json({ 
      message: 'No hay autenticación válida',
      isAuthenticated: false 
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Error al cerrar sesión' });
      }
      res.clearCookie('finanzapp_session');
      res.json({ message: 'Sesión cerrada exitosamente' });
    });
  } else {
    res.json({ message: 'No hay sesión activa' });
  }
});

export default router;
