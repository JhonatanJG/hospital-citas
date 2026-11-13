const { query } = require('./db');

function mapHorario(row) {
  // hora_inicio and hora_fin may come as "HH:MM:SS", trim to "HH:MM"
  const toHHMM = (val) => (val ? String(val).slice(0, 5) : null);
  return {
    id: String(row.id_horario),
    horaInicio: toHHMM(row.hora_inicio),
    horaFin: toHHMM(row.hora_fin),
  };
}

async function getAll() {
  const { rows } = await query('SELECT * FROM horarios ORDER BY hora_inicio ASC');
  return rows.map(mapHorario);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM horarios WHERE id_horario = $1', [id]);
  if (!rows.length) {
    const e = new Error('Horario no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapHorario(rows[0]);
}

async function create(data) {
  const { horaInicio, horaFin } = data;
  // Validate horaFin > horaInicio
  if (horaFin <= horaInicio) {
    const e = new Error('La hora de fin debe ser mayor a la hora de inicio');
    e.statusCode = 400;
    throw e;
  }
  const { rows } = await query(
    'INSERT INTO horarios (hora_inicio, hora_fin) VALUES ($1, $2) RETURNING *',
    [horaInicio, horaFin]
  );
  return mapHorario(rows[0]);
}

async function update(id, data) {
  const existing = await getById(id);
  const horaInicio = data.horaInicio ?? existing.horaInicio;
  const horaFin = data.horaFin ?? existing.horaFin;

  if (horaFin <= horaInicio) {
    const e = new Error('La hora de fin debe ser mayor a la hora de inicio');
    e.statusCode = 400;
    throw e;
  }

  const { rows } = await query(
    'UPDATE horarios SET hora_inicio=$1, hora_fin=$2 WHERE id_horario=$3 RETURNING *',
    [horaInicio, horaFin, id]
  );
  if (!rows.length) {
    const e = new Error('Horario no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapHorario(rows[0]);
}

async function deleteHorario(id) {
  // Check if horario has disponibilidad records
  const { rows: disp } = await query(
    'SELECT 1 FROM disponibilidad WHERE id_horario = $1 LIMIT 1',
    [id]
  );
  if (disp.length) {
    const e = new Error('El horario tiene cupos asignados');
    e.statusCode = 409;
    throw e;
  }

  const { rowCount } = await query('DELETE FROM horarios WHERE id_horario = $1', [id]);
  if (!rowCount) {
    const e = new Error('Horario no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return { deleted: true };
}

module.exports = { getAll, getById, create, update, delete: deleteHorario };
