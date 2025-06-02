import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();

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

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId
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
      console.log('No se encontró usuario con esa cédula');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = users[0];
    console.log('Usuario encontrado:', { id: user.id, cedula: user.cedula });

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Contraseña válida:', validPassword);

    if (!validPassword) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, cedula: user.cedula },
      'tu_secreto_jwt', // En producción, usar variables de entorno
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        cedula: user.cedula,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No hay token' });
  }

  try {
    const decoded = jwt.verify(token, 'tu_secreto_jwt');
    const [users] = await pool.query(
      'SELECT id, cedula, name, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(403).json({ message: 'Token inválido' });
  }
});

export default router;
