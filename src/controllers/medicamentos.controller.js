const medicamentosService = require('../services/medicamentos.service');
const { requireFields } = require('../middlewares/validate');

function validateStock(stock) {
  const n = Number(stock);
  if (isNaN(n) || n < 0) {
    const e = new Error('El campo "stock" debe ser un número mayor o igual a 0');
    e.statusCode = 400;
    throw e;
  }
}

const getAllMedicamentos = async (req, res, next) => {
  try {
    const result = await medicamentosService.getAll(req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getMedicamentoById = async (req, res, next) => {
  try {
    const result = await medicamentosService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createMedicamento = async (req, res, next) => {
  try {
    requireFields(['nombre', 'stock'], req.body);
    validateStock(req.body.stock);
    const result = await medicamentosService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateMedicamento = async (req, res, next) => {
  try {
    if (req.body.stock !== undefined) {
      validateStock(req.body.stock);
    }
    const result = await medicamentosService.update(req.params.id, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteMedicamento = async (req, res, next) => {
  try {
    const result = await medicamentosService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllMedicamentos,
  getMedicamentoById,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
};
