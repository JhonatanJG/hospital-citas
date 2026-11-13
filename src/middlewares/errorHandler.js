const { NODE_ENV } = require('../config/env');
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  if (NODE_ENV !== 'production') console.error('[ERROR]', err);
  res.status(statusCode).json({ ok: false, error: message });
}
module.exports = errorHandler;
