const disponibilidadService = require('../services/disponibilidad.service');
const { requireFields, validateFutureDate } = require('../middlewares/validate');

const getDisponibilidad = async (req, res, next) => {
  try {
    const { medicoId, especialidad, fecha, estado } = req.query;
    const result = await disponibilidadService.getAll({ medicoId, especialidad, fecha, estado });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getDisponibilidadById = async (req, res, next) => {
  try {
    const result = await disponibilidadService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const createDisponibilidad = async (req, res, next) => {
  try {
    requireFields(['medicoId', 'horarioId', 'salaId', 'fecha'], req.body);
    validateFutureDate(req.body.fecha);
    const result = await disponibilidadService.create(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteDisponibilidad = async (req, res, next) => {
  try {
    const result = await disponibilidadService.remove(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const generarCupos = async (req, res, next) => {
  try {
    requireFields(['medicoId', 'salaId', 'fechaInicio', 'fechaFin', 'horarioIds'], req.body);

    const { fechaInicio, fechaFin, horarioIds } = req.body;

    validateFutureDate(fechaInicio);
    validateFutureDate(fechaFin);

    if (new Date(fechaInicio + 'T00:00:00') > new Date(fechaFin + 'T00:00:00')) {
      const e = new Error('fechaInicio debe ser menor o igual a fechaFin');
      e.statusCode = 400;
      throw e;
    }

    if (!Array.isArray(horarioIds) || horarioIds.length === 0) {
      const e = new Error('horarioIds debe ser un arreglo con al menos un elemento');
      e.statusCode = 400;
      throw e;
    }

    const result = await disponibilidadService.generarCupos(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDisponibilidad,
  getDisponibilidadById,
  createDisponibilidad,
  deleteDisponibilidad,
  generarCupos,
};
