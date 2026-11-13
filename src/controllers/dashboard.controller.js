const dashboardService = require('../services/dashboard.service');

const getDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getStats();
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
