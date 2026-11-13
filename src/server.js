require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { PORT, NODE_ENV, DB_ENGINE, AUTO_SEED } = require('./config/env');
const app = require('./app');

async function startServer() {
  try {
    const motorName = DB_ENGINE === 'postgres' ? 'PostgreSQL' : 'Firestore';

    if (DB_ENGINE === 'postgres') {
      const { pool } = require('./repositories/postgres/db');
      console.log('📦 Conectando a PostgreSQL y aplicando schema.sql idempotente...');
      const schemaPath = path.join(__dirname, '../db/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✅ Esquema PostgreSQL listo.');

      if (AUTO_SEED) {
        const { rows } = await pool.query('SELECT COUNT(*) AS count FROM medicos');
        const count = parseInt(rows[0]?.count || '0', 10);
        if (count === 0) {
          console.log('🌱 AUTO_SEED=true y base de datos vacía. Ejecutando seed...');
          const { seedAll } = require('../scripts/seed');
          await seedAll();
        } else {
          console.log(`ℹ️ Base de datos ya contiene ${count} médicos. Se omite AUTO_SEED.`);
        }
      }
    } else if (DB_ENGINE === 'firestore') {
      const { getDb } = require('./repositories/firestore/firebase');
      const db = getDb();
      console.log('🔥 Conectado a Cloud Firestore.');

      if (AUTO_SEED) {
        const snapshot = await db.collection('medicos').limit(1).get();
        if (snapshot.empty) {
          console.log('🌱 AUTO_SEED=true y Firestore vacío. Ejecutando seed...');
          const { seedAll } = require('../scripts/seed');
          await seedAll();
        } else {
          console.log('ℹ️ Firestore ya contiene registros. Se omite AUTO_SEED.');
        }
      }
    }

    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🏥 ============================================================');
      console.log('   MediCitas - Sistema de Gestión de Citas Hospitalarias');
      console.log('🏥 ============================================================');
      console.log(`   🚀 Servidor escuchando en: http://localhost:${PORT}`);
      console.log(`   ⚙️  Motor de Persistencia:  ${motorName}`);
      console.log(`   🌍 Entorno:                ${NODE_ENV}`);
      console.log(`   🌱 Auto-Seed:              ${AUTO_SEED ? 'Activado' : 'Desactivado'}`);
      console.log('🏥 ============================================================');
      console.log('');
    });

    return server;
  } catch (err) {
    console.error('❌ Error fatal al iniciar el servidor:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
