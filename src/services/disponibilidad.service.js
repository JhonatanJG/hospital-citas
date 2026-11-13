const { disponibilidadRepo } = require('../repositories');

const getAll = async (filters) => disponibilidadRepo.getAll(filters);
const getById = async (id) => disponibilidadRepo.getById(id);
const create = async (data) => disponibilidadRepo.create(data);
const remove = async (id) => disponibilidadRepo.delete(id);
const generarCupos = async (data) => disponibilidadRepo.generarCupos(data);

module.exports = { getAll, getById, create, remove, generarCupos };
