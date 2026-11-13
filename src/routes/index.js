const express = require('express');
const router = express.Router();
router.use('/medicos', require('./medicos.routes'));
router.use('/pacientes', require('./pacientes.routes'));
router.use('/salas', require('./salas.routes'));
router.use('/horarios', require('./horarios.routes'));
router.use('/medicamentos', require('./medicamentos.routes'));
router.use('/disponibilidad', require('./disponibilidad.routes'));
router.use('/reservas', require('./reservas.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.get('/health', (req, res) => res.json({ ok: true, data: { status: 'ok', timestamp: new Date().toISOString() } }));
router.get('/info', (req, res) => {
  const { DB_ENGINE } = require('../config/env');
  res.json({ ok: true, data: { motor: DB_ENGINE === 'postgres' ? 'PostgreSQL' : 'Firestore', version: '1.0.0' } });
});
module.exports = router;
