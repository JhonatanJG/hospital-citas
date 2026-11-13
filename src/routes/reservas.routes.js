const express = require('express');
const router = express.Router();
const {
  getAllReservas,
  getReservaById,
  agendarCita,
  cancelarCita,
  reprogramarCita,
  atenderCita,
  getPrescripciones,
  addPrescripcion,
  deletePrescripcion,
} = require('../controllers/reservas.controller');

router.get('/', getAllReservas);
router.get('/:id', getReservaById);
router.post('/', agendarCita);
router.patch('/:id/cancelar', cancelarCita);
router.patch('/:id/reprogramar', reprogramarCita);
router.patch('/:id/atender', atenderCita);
router.get('/:id/prescripciones', getPrescripciones);
router.post('/:id/prescripciones', addPrescripcion);
router.delete('/:id/prescripciones/:prescripcionId', deletePrescripcion);

module.exports = router;
