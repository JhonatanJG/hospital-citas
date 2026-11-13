const horariosService = require('../services/horarios.service');
const { requireFields } = require('../middlewares/validate');

const TIME_REGEX = /^\d{2}:\d{2}$/;

function validateTimeFormat(value, fieldName) {
  if (!TIME_REGEX.test(value)) {
    const e = new Error(`El campo "${fieldName}" debe tener formato HH:MM`);
    e.statusCode = 400;
    throw e;
  }
}

const getAllHorarios = async (req, res, next) => {
  try {
    const result = await horariosService.getAll(req.query);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getHorarioById = async (req, res, next) => {
  try {
    const result = await horariosService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createHorario = async (req, res, next) => {
  try {
    requireFields(['horaInicio', 'horaFin'], req.body);
    validateTimeFormat(req.body.horaInicio, 'horaInicio');
    validateTimeFormat(req.body.horaFin, 'horaFin');
    const result = await horariosService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateHorario = async (req, res, next) => {
  try {
    if (req.body.horaInicio !== undefined) {
      validateTimeFormat(req.body.horaInicio, 'horaInicio');
    }
    if (req.body.horaFin !== undefined) {
      validateTimeFormat(req.body.horaFin, 'horaFin');
    }
    const result = await horariosService.update(req.params.id, req.body);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteHorario = async (req, res, next) => {
  try {
    const result = await horariosService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllHorarios, getHorarioById, createHorario, updateHorario, deleteHorario };
