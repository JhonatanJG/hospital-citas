const express = require('express');
const router = express.Router();
const {
  getAllSalas,
  getSalaById,
  createSala,
  updateSala,
  deleteSala,
} = require('../controllers/salas.controller');

router.get('/', getAllSalas);
router.get('/:id', getSalaById);
router.post('/', createSala);
router.put('/:id', updateSala);
router.delete('/:id', deleteSala);

module.exports = router;
