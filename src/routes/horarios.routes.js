const express = require('express');
const router = express.Router();
const {
  getAllHorarios,
  getHorarioById,
  createHorario,
  updateHorario,
  deleteHorario,
} = require('../controllers/horarios.controller');

router.get('/', getAllHorarios);
router.get('/:id', getHorarioById);
router.post('/', createHorario);
router.put('/:id', updateHorario);
router.delete('/:id', deleteHorario);

module.exports = router;
