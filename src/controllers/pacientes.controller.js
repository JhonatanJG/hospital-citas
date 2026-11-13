const pacientesService = require('../services/pacientes.service');
const { requireFields, validateEmail } = require('../middlewares/validate');

const getAllPacientes = async (req, res, next) => {
  try {
    const result = await pacientesService.getAll(req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getPacienteById = async (req, res, next) => {
  try {
    const result = await pacientesService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createPaciente = async (req, res, next) => {
  try {
    requireFields(['documento', 'nombre'], req.body);
    if (req.body.email) {
      validateEmail(req.body.email);
    }
    const result = await pacientesService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updatePaciente = async (req, res, next) => {
  try {
    if (req.body.email) {
      validateEmail(req.body.email);
    }
    const result = await pacientesService.update(req.params.id, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deletePaciente = async (req, res, next) => {
  try {
    const result = await pacientesService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const searchPacientes = async (req, res, next) => {
  try {
    const result = await pacientesService.search(req.query.q);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePaciente,
  deletePaciente,
  searchPacientes,
};
