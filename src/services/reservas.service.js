const { reservasRepo } = require('../repositories');

const getAll = async (filters) => reservasRepo.getAll(filters);
const getById = async (id) => reservasRepo.getById(id);
const agendar = async (data) => reservasRepo.agendar(data);
const cancelar = async (id) => reservasRepo.cancelar(id);
const reprogramar = async (id, nuevaDisponibilidadId) => reservasRepo.reprogramar(id, nuevaDisponibilidadId);
const atender = async (id) => reservasRepo.atender(id);
const getPrescripciones = async (id) => reservasRepo.getPrescripciones(id);
const addPrescripcion = async (id, data) => reservasRepo.addPrescripcion(id, data);
const deletePrescripcion = async (id, prescripcionId) => reservasRepo.deletePrescripcion(id, prescripcionId);

module.exports = {
  getAll,
  getById,
  agendar,
  cancelar,
  reprogramar,
  atender,
  getPrescripciones,
  addPrescripcion,
  deletePrescripcion,
};
