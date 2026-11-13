const { Pool } = require('pg');
const { DATABASE_URL, NODE_ENV } = require('../../config/env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('PostgreSQL pool error:', err));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
