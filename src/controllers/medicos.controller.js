const medicosService = require('../services/medicos.service');
const { requireFields } = require('../middlewares/validate');

const getAllMedicos = async (req, res, next) => {
  try {
    const result = await medicosService.getAll(req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getMedicoById = async (req, res, next) => {
  try {
    const result = await medicosService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createMedico = async (req, res, next) => {
  try {
    requireFields(['documento', 'nombre', 'especialidad'], req.body);
    const result = await medicosService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateMedico = async (req, res, next) => {
  try {
    const result = await medicosService.update(req.params.id, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteMedico = async (req, res, next) => {
  try {
    const result = await medicosService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllMedicos, getMedicoById, createMedico, updateMedico, deleteMedico };
