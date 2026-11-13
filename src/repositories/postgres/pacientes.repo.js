const { query } = require('./db');

function mapPaciente(row) {
  return {
    id: String(row.id_paciente),
    documento: row.documento,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email,
    fechaNacimiento: row.fecha_nacimiento
      ? row.fecha_nacimiento.toISOString().slice(0, 10)
      : null,
  };
}

async function getAll(filters = {}) {
  let text = 'SELECT * FROM pacientes';
  const params = [];
  const conditions = [];

  if (filters.nombre) {
    params.push(`%${filters.nombre}%`);
    conditions.push(`nombre ILIKE $${params.length}`);
  }
  if (filters.documento) {
    params.push(`%${filters.documento}%`);
    conditions.push(`documento ILIKE $${params.length}`);
  }
  if (conditions.length) {
    text += ' WHERE ' + conditions.join(' AND ');
  }
  text += ' ORDER BY nombre ASC';
  const { rows } = await query(text, params);
  return rows.map(mapPaciente);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM pacientes WHERE id_paciente = $1', [id]);
  if (!rows.length) {
    const e = new Error('Paciente no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapPaciente(rows[0]);
}

async function create(data) {
  const { documento, nombre, telefono, email, fechaNacimiento } = data;
  try {
    const { rows } = await query(
      `INSERT INTO pacientes (documento, nombre, telefono, email, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [documento, nombre, telefono, email, fechaNacimiento || null]
    );
    return mapPaciente(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      // unique_violation
      const e = new Error('Ya existe un paciente con ese documento');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

async function update(id, data) {
  const existing = await getById(id); // throws 404 if not found
  const documento = data.documento ?? existing.documento;
  const nombre = data.nombre ?? existing.nombre;
  const telefono = data.telefono ?? existing.telefono;
  const email = data.email ?? existing.email;
  const fechaNacimiento =
    data.fechaNacimiento !== undefined ? data.fechaNacimiento : existing.fechaNacimiento;

  const { rows } = await query(
    `UPDATE pacientes SET documento=$1, nombre=$2, telefono=$3, email=$4, fecha_nacimiento=$5
     WHERE id_paciente=$6 RETURNING *`,
    [documento, nombre, telefono, email, fechaNacimiento || null, id]
  );
  if (!rows.length) {
    const e = new Error('Paciente no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapPaciente(rows[0]);
}

async function deletePaciente(id) {
  // Check if paciente has reservas
  const { rows: reservas } = await query(
    'SELECT 1 FROM reservas WHERE id_paciente = $1 LIMIT 1',
    [id]
  );
  if (reservas.length) {
    const e = new Error('El paciente tiene citas registradas');
    e.statusCode = 409;
    throw e;
  }

  const { rowCount } = await query('DELETE FROM pacientes WHERE id_paciente = $1', [id]);
  if (!rowCount) {
    const e = new Error('Paciente no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return { deleted: true };
}

async function findByDocumento(doc) {
  const { rows } = await query('SELECT * FROM pacientes WHERE documento = $1', [doc]);
  return rows.length ? mapPaciente(rows[0]) : null;
}

async function search(queryStr) {
  const param = `%${queryStr}%`;
  const { rows } = await query(
    'SELECT * FROM pacientes WHERE nombre ILIKE $1 OR documento ILIKE $1 ORDER BY nombre ASC',
    [param]
  );
  return rows.map(mapPaciente);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deletePaciente,
  findByDocumento,
  search,
};
