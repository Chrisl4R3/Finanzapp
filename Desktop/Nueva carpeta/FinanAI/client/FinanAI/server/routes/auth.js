import express from 'express';
import bcrypt from 'bcrypt';
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

    // Guardar datos del usuario en la sesión
    req.session.user = {
      id: user.id,
      cedula: user.cedula,
      name: user.name,
      email: user.email
    };

    // Guardar la sesión
    req.session.save((err) => {
      if (err) {
        console.error('Error al guardar la sesión:', err);
        return res.status(500).json({ message: 'Error al iniciar sesión' });
      }

      res.json({
        message: 'Inicio de sesión exitoso',
        user: {
          id: user.id,
          cedula: user.cedula,
          name: user.name,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Verificar sesión
router.get('/verify', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'No hay sesión activa' });
  }
});

// Cerrar sesión
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
});

export default router;
