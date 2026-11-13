const { pacientesRepo } = require('../repositories');

const getAll = async (filters) => pacientesRepo.getAll(filters);
const getById = async (id) => pacientesRepo.getById(id);
const create = async (data) => pacientesRepo.create(data);
const update = async (id, data) => pacientesRepo.update(id, data);
const remove = async (id) => pacientesRepo.delete(id);
const search = async (q) => pacientesRepo.search(q);

module.exports = { getAll, getById, create, update, remove, search };
