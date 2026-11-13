const reservasService = require('../services/reservas.service');
const { requireFields } = require('../middlewares/validate');

const getAllReservas = async (req, res, next) => {
  try {
    const { estado, fecha, medicoId, pacienteId } = req.query;
    const result = await reservasService.getAll({ estado, fecha, medicoId, pacienteId });
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getReservaById = async (req, res, next) => {
  try {
    const result = await reservasService.getById(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const agendarCita = async (req, res, next) => {
  try {
    requireFields(['pacienteId', 'disponibilidadId', 'motivo'], req.body);
    const result = await reservasService.agendar(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const cancelarCita = async (req, res, next) => {
  try {
    const result = await reservasService.cancelar(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const reprogramarCita = async (req, res, next) => {
  try {
    requireFields(['nuevaDisponibilidadId'], req.body);
    const result = await reservasService.reprogramar(req.params.id, req.body.nuevaDisponibilidadId);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const atenderCita = async (req, res, next) => {
  try {
    const result = await reservasService.atender(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getPrescripciones = async (req, res, next) => {
  try {
    const result = await reservasService.getPrescripciones(req.params.id);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const addPrescripcion = async (req, res, next) => {
  try {
    requireFields(['medicamentoId', 'cantidad'], req.body);
    const cantidad = Number(req.body.cantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
      const e = new Error('El campo "cantidad" debe ser un número mayor a 0');
      e.statusCode = 400;
      throw e;
    }
    const result = await reservasService.addPrescripcion(req.params.id, req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deletePrescripcion = async (req, res, next) => {
  try {
    const result = await reservasService.deletePrescripcion(req.params.id, req.params.prescripcionId);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllReservas,
  getReservaById,
  agendarCita,
  cancelarCita,
  reprogramarCita,
  atenderCita,
  getPrescripciones,
  addPrescripcion,
  deletePrescripcion,
};
