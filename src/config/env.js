require('dotenv').config();
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_ENGINE = process.env.DB_ENGINE || 'postgres';
if (!['postgres', 'firestore'].includes(DB_ENGINE)) {
  throw new Error(`DB_ENGINE inválido: "${DB_ENGINE}". Debe ser "postgres" o "firestore".`);
}
const DATABASE_URL = process.env.DATABASE_URL || '';
let FIREBASE_SERVICE_ACCOUNT = null;
if (DB_ENGINE === 'firestore') {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT es requerido cuando DB_ENGINE=firestore');
  try { FIREBASE_SERVICE_ACCOUNT = JSON.parse(raw); } catch(e) { throw new Error('FIREBASE_SERVICE_ACCOUNT debe ser JSON válido'); }
}
const AUTO_SEED = process.env.AUTO_SEED === 'true';
module.exports = { PORT, NODE_ENV, DB_ENGINE, DATABASE_URL, FIREBASE_SERVICE_ACCOUNT, AUTO_SEED };
