const { query } = require('./db');

function mapSala(row) {
  return {
    id: String(row.id_sala),
    nombre: row.nombre,
    piso: row.piso,
  };
}

async function getAll() {
  const { rows } = await query('SELECT * FROM salas ORDER BY nombre ASC');
  return rows.map(mapSala);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM salas WHERE id_sala = $1', [id]);
  if (!rows.length) {
    const e = new Error('Sala no encontrada');
    e.statusCode = 404;
    throw e;
  }
  return mapSala(rows[0]);
}

async function create(data) {
  const { nombre, piso } = data;
  try {
    const { rows } = await query(
      'INSERT INTO salas (nombre, piso) VALUES ($1, $2) RETURNING *',
      [nombre, piso]
    );
    return mapSala(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Ya existe una sala con ese nombre');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

async function update(id, data) {
  const existing = await getById(id);
  const nombre = data.nombre ?? existing.nombre;
  const piso = data.piso ?? existing.piso;

  const { rows } = await query(
    'UPDATE salas SET nombre=$1, piso=$2 WHERE id_sala=$3 RETURNING *',
    [nombre, piso, id]
  );
  if (!rows.length) {
    const e = new Error('Sala no encontrada');
    e.statusCode = 404;
    throw e;
  }
  return mapSala(rows[0]);
}

async function deleteSala(id) {
  // Check if sala has disponibilidad records
  const { rows: disp } = await query(
    'SELECT 1 FROM disponibilidad WHERE id_sala = $1 LIMIT 1',
    [id]
  );
  if (disp.length) {
    const e = new Error('La sala tiene cupos asignados');
    e.statusCode = 409;
    throw e;
  }

  const { rowCount } = await query('DELETE FROM salas WHERE id_sala = $1', [id]);
  if (!rowCount) {
    const e = new Error('Sala no encontrada');
    e.statusCode = 404;
    throw e;
  }
  return { deleted: true };
}

module.exports = { getAll, getById, create, update, delete: deleteSala };
