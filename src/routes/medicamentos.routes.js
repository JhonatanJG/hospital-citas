const express = require('express');
const router = express.Router();
const {
  getAllMedicamentos,
  getMedicamentoById,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
} = require('../controllers/medicamentos.controller');

router.get('/', getAllMedicamentos);
router.get('/:id', getMedicamentoById);
router.post('/', createMedicamento);
router.put('/:id', updateMedicamento);
router.delete('/:id', deleteMedicamento);

module.exports = router;
