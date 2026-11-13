require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/repositories/postgres/db');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📦 Aplicando esquema PostgreSQL desde db/schema.sql...');
    await pool.query(schema);
    console.log('✅ Esquema PostgreSQL aplicado exitosamente');
  } catch (err) {
    console.error('❌ Error al inicializar base de datos:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDb();
}

module.exports = { initDb };
