const { salasRepo } = require('../repositories');

const getAll = async (filters) => salasRepo.getAll(filters);
const getById = async (id) => salasRepo.getById(id);
const create = async (data) => salasRepo.create(data);
const update = async (id, data) => salasRepo.update(id, data);
const remove = async (id) => salasRepo.delete(id);

module.exports = { getAll, getById, create, update, remove };
