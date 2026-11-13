const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = require('../../config/env');

let pool;

if (DATABASE_URL === 'memory' || (!DATABASE_URL && NODE_ENV !== 'production')) {
  console.log('⚡ Utilizando PostgreSQL en memoria (pg-mem) para desarrollo local.');
  const { newDb } = require('pg-mem');
  const db = newDb();
  db.public.registerFunction({
    name: 'now',
    returns: db.public.getType('timestamp'),
    implementation: () => new Date(),
  });
  const adapter = db.adapters.createPg();
  pool = new adapter.Pool();
} else {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => console.error('PostgreSQL pool error:', err));
}

module.exports = { pool, query: (text, params) => pool.query(text, params) };
