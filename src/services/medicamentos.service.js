const { medicamentosRepo } = require('../repositories');

const getAll = async (filters) => medicamentosRepo.getAll(filters);
const getById = async (id) => medicamentosRepo.getById(id);
const create = async (data) => medicamentosRepo.create(data);
const update = async (id, data) => medicamentosRepo.update(id, data);
const remove = async (id) => medicamentosRepo.delete(id);

module.exports = { getAll, getById, create, update, remove };
