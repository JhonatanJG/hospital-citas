const express = require('express');
const router = express.Router();
const {
  getAllMedicos,
  getMedicoById,
  createMedico,
  updateMedico,
  deleteMedico,
} = require('../controllers/medicos.controller');

router.get('/', getAllMedicos);
router.get('/:id', getMedicoById);
router.post('/', createMedico);
router.put('/:id', updateMedico);
router.delete('/:id', deleteMedico);

module.exports = router;
