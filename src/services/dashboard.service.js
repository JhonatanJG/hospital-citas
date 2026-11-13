const { dashboardRepo } = require('../repositories');

const getStats = async () => dashboardRepo.getStats();

module.exports = { getStats };
