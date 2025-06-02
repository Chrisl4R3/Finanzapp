import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Palitobonito2',
  database: 'finanai_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function updateCategories() {
  try {
    const sqlFile = path.join(__dirname, 'update_categories.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());

    const connection = await pool.getConnection();
    console.log('Iniciando actualización de categorías...');

    try {
      await connection.beginTransaction();

      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Ejecutando:', statement.trim());
          await connection.query(statement);
        }
      }

      await connection.commit();
      console.log('¡Categorías actualizadas exitosamente!');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar categorías:', error);
  } finally {
    await pool.end();
  }
}

updateCategories(); 