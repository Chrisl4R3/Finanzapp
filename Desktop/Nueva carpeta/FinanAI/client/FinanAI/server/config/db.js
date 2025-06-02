import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Palitobonito2', // Ajusta según tu configuración de MySQL
  database: 'finanai_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test de conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión exitosa a la base de datos');
    connection.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
  }
};

testConnection();

export default pool;
