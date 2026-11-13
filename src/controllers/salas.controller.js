const salasService = require('../services/salas.service');
const { requireFields } = require('../middlewares/validate');

function validatePiso(piso) {
  const n = parseInt(piso, 10);
  if (!Number.isInteger(n) || n < 1) {
    const e = new Error('El campo "piso" debe ser un entero positivo');
    e.statusCode = 400;
    throw e;
  }
}

const getAllSalas = async (req, res, next) => {
  try {
    const result = await salasService.getAll(req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getSalaById = async (req, res, next) => {
  try {
    const result = await salasService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createSala = async (req, res, next) => {
  try {
    requireFields(['nombre', 'piso'], req.body);
    validatePiso(req.body.piso);
    const result = await salasService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateSala = async (req, res, next) => {
  try {
    if (req.body.piso !== undefined) {
      validatePiso(req.body.piso);
    }
    const result = await salasService.update(req.params.id, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteSala = async (req, res, next) => {
  try {
    const result = await salasService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllSalas, getSalaById, createSala, updateSala, deleteSala };
