const express = require('express');
const router = express.Router();
const {
  getDisponibilidad,
  getDisponibilidadById,
  createDisponibilidad,
  deleteDisponibilidad,
  generarCupos,
} = require('../controllers/disponibilidad.controller');

router.get('/', getDisponibilidad);
router.post('/generar', generarCupos);
router.get('/:id', getDisponibilidadById);
router.post('/', createDisponibilidad);
router.delete('/:id', deleteDisponibilidad);

module.exports = router;
