function requireFields(fields, body) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      const e = new Error(`El campo "${f}" es obligatorio`);
      e.statusCode = 400; throw e;
    }
  }
}
function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const e = new Error(`El email "${email}" no tiene formato válido`);
    e.statusCode = 400; throw e;
  }
}
function validateDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(Date.parse(dateStr))) {
    const e = new Error(`La fecha "${dateStr}" no tiene formato válido (YYYY-MM-DD)`);
    e.statusCode = 400; throw e;
  }
}
function validateFutureDate(dateStr) {
  validateDate(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  if (d < today) {
    const e = new Error('No se pueden crear cupos en fechas pasadas');
    e.statusCode = 400; throw e;
  }
}
function validateEnum(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    const e = new Error(`El campo "${fieldName}" debe ser uno de: ${allowed.join(', ')}`);
    e.statusCode = 400; throw e;
  }
}
module.exports = { requireFields, validateEmail, validateDate, validateFutureDate, validateEnum };
