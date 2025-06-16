import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function testConnection() {
  let connection;
  try {
    console.log('🔌 Intentando conectar a la base de datos...');
    console.log(`📡 Host: ${config.host}:${config.port}`);
    console.log(`👤 Usuario: ${config.user}`);
    
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Probar consulta simple
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log(`🧪 Resultado de prueba: ${rows[0].result}`);
    
    // Verificar tablas existentes
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 Tablas en la base de datos (${tables.length}):`);
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
    process.exit(0);
  }
}

testConnection();
