const { horariosRepo } = require('../repositories');

const getAll = async (filters) => horariosRepo.getAll(filters);
const getById = async (id) => horariosRepo.getById(id);
const create = async (data) => horariosRepo.create(data);
const update = async (id, data) => horariosRepo.update(id, data);
const remove = async (id) => horariosRepo.delete(id);

module.exports = { getAll, getById, create, update, remove };
