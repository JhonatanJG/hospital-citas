const express = require('express');
const router = express.Router();
const {
  getAllPacientes,
  searchPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente,
} = require('../controllers/pacientes.controller');

router.get('/', getAllPacientes);
router.get('/buscar', searchPacientes);
router.get('/:id', getPacienteById);
router.post('/', createPaciente);
router.put('/:id', updatePaciente);
router.delete('/:id', deletePaciente);

module.exports = router;
