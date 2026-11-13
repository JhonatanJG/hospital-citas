const { query } = require('./db');

function mapMedico(row) {
  return {
    id: String(row.id_medico),
    documento: row.documento,
    nombre: row.nombre,
    especialidad: row.especialidad,
    telefono: row.telefono,
  };
}

async function getAll(filters = {}) {
  let text = 'SELECT * FROM medicos';
  const params = [];
  if (filters.especialidad) {
    params.push(filters.especialidad);
    text += ` WHERE especialidad = $${params.length}`;
  }
  text += ' ORDER BY nombre ASC';
  const { rows } = await query(text, params);
  return rows.map(mapMedico);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM medicos WHERE id_medico = $1', [id]);
  if (!rows.length) {
    const e = new Error('Médico no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapMedico(rows[0]);
}

async function create(data) {
  const { documento, nombre, especialidad, telefono } = data;
  const { rows } = await query(
    'INSERT INTO medicos (documento, nombre, especialidad, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
    [documento, nombre, especialidad, telefono]
  );
  return mapMedico(rows[0]);
}

async function update(id, data) {
  const existing = await getById(id); // throws 404 if not found
  const documento = data.documento ?? existing.documento;
  const nombre = data.nombre ?? existing.nombre;
  const especialidad = data.especialidad ?? existing.especialidad;
  const telefono = data.telefono ?? existing.telefono;

  const { rows } = await query(
    `UPDATE medicos SET documento=$1, nombre=$2, especialidad=$3, telefono=$4
     WHERE id_medico=$5 RETURNING *`,
    [documento, nombre, especialidad, telefono, id]
  );
  if (!rows.length) {
    const e = new Error('Médico no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapMedico(rows[0]);
}

async function deleteMedico(id) {
  // Check if medico has disponibilidad records
  const { rows: disp } = await query(
    'SELECT 1 FROM disponibilidad WHERE id_medico = $1 LIMIT 1',
    [id]
  );
  if (disp.length) {
    const e = new Error('El médico tiene cupos asignados y no puede eliminarse');
    e.statusCode = 409;
    throw e;
  }

  const { rowCount } = await query('DELETE FROM medicos WHERE id_medico = $1', [id]);
  if (!rowCount) {
    const e = new Error('Médico no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return { deleted: true };
}

async function findByDocumento(doc) {
  const { rows } = await query('SELECT * FROM medicos WHERE documento = $1', [doc]);
  return rows.length ? mapMedico(rows[0]) : null;
}

module.exports = { getAll, getById, create, update, delete: deleteMedico, findByDocumento };
