const { medicosRepo } = require('../repositories');

const getAll = async (filters) => medicosRepo.getAll(filters);
const getById = async (id) => medicosRepo.getById(id);
const create = async (data) => medicosRepo.create(data);
const update = async (id, data) => medicosRepo.update(id, data);
const remove = async (id) => medicosRepo.delete(id);

module.exports = { getAll, getById, create, update, remove };
