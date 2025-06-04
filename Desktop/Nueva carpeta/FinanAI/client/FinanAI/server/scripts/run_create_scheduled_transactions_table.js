import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createScheduledTransactionsTable() {
  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'create_scheduled_transactions_table.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Ejecutar el SQL
    await pool.query(sqlContent);
    console.log('Tabla de transacciones programadas creada exitosamente');
  } catch (error) {
    console.error('Error al crear la tabla de transacciones programadas:', error);
  } finally {
    // Cerrar la conexión
    await pool.end();
  }
}

createScheduledTransactionsTable(); 