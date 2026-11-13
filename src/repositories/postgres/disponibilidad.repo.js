const { query, pool } = require('./db');

const JOIN_SQL = `
  SELECT
    d.id_disponibilidad,
    d.id_medico,
    m.nombre        AS medico_nombre,
    m.especialidad,
    d.id_sala,
    s.nombre        AS sala_nombre,
    s.piso,
    d.id_horario,
    h.hora_inicio,
    h.hora_fin,
    d.fecha,
    d.estado
  FROM disponibilidad d
  JOIN medicos   m ON m.id_medico   = d.id_medico
  JOIN salas     s ON s.id_sala     = d.id_sala
  JOIN horarios  h ON h.id_horario  = d.id_horario
`;

function mapDisponibilidad(row) {
  const toHHMM = (val) => (val ? String(val).slice(0, 5) : null);
  return {
    id: String(row.id_disponibilidad),
    medicoId: String(row.id_medico),
    medicoNombre: row.medico_nombre,
    especialidad: row.especialidad,
    salaId: String(row.id_sala),
    salaNombre: row.sala_nombre,
    piso: row.piso,
    horarioId: String(row.id_horario),
    horaInicio: toHHMM(row.hora_inicio),
    horaFin: toHHMM(row.hora_fin),
    fecha: row.fecha ? row.fecha.toISOString().slice(0, 10) : null,
    estado: row.estado,
  };
}

async function getAll(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.medicoId) {
    params.push(filters.medicoId);
    conditions.push(`d.id_medico = $${params.length}`);
  }
  if (filters.especialidad) {
    params.push(filters.especialidad);
    conditions.push(`m.especialidad = $${params.length}`);
  }
  if (filters.fecha) {
    params.push(filters.fecha);
    conditions.push(`d.fecha = $${params.length}`);
  }
  if (filters.estado) {
    params.push(filters.estado);
    conditions.push(`d.estado = $${params.length}`);
  }

  let text = JOIN_SQL;
  if (conditions.length) {
    text += ' WHERE ' + conditions.join(' AND ');
  }
  text += ' ORDER BY d.fecha ASC, h.hora_inicio ASC';

  const { rows } = await query(text, params);
  return rows.map(mapDisponibilidad);
}

async function getById(id) {
  const { rows } = await query(JOIN_SQL + ' WHERE d.id_disponibilidad = $1', [id]);
  if (!rows.length) {
    const e = new Error('Cupo no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return mapDisponibilidad(rows[0]);
}

async function create(data) {
  const { medicoId, horarioId, salaId, fecha, estado = 'libre' } = data;
  try {
    const { rows } = await query(
      `INSERT INTO disponibilidad (id_medico, id_horario, id_sala, fecha, estado)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_disponibilidad`,
      [medicoId, horarioId, salaId, fecha, estado]
    );
    return getById(rows[0].id_disponibilidad);
  } catch (err) {
    if (err.code === '23505') {
      // unique constraint violation — determine which one
      if (err.constraint && err.constraint.includes('sala')) {
        const e = new Error('La sala ya está ocupada en ese horario y fecha');
        e.statusCode = 409;
        throw e;
      }
      const e = new Error('Ya existe un cupo para ese médico en ese horario y fecha');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

async function deleteDisponibilidad(id) {
  // Check estado is 'libre'
  const { rows } = await query(
    'SELECT estado FROM disponibilidad WHERE id_disponibilidad = $1',
    [id]
  );
  if (!rows.length) {
    const e = new Error('Cupo no encontrado');
    e.statusCode = 404;
    throw e;
  }
  if (rows[0].estado !== 'libre') {
    const e = new Error('Solo se pueden eliminar cupos libres');
    e.statusCode = 409;
    throw e;
  }

  // Check no active reservas
  const { rows: reservas } = await query(
    `SELECT 1 FROM reservas
     WHERE id_disponibilidad = $1 AND estado NOT IN ('cancelada')
     LIMIT 1`,
    [id]
  );
  if (reservas.length) {
    const e = new Error('El cupo tiene reservas activas y no puede eliminarse');
    e.statusCode = 409;
    throw e;
  }

  await query('DELETE FROM disponibilidad WHERE id_disponibilidad = $1', [id]);
  return { deleted: true };
}

/**
 * Generate cupos for weekdays between fechaInicio and fechaFin for each horarioId.
 * Ignores duplicates/conflicts.
 */
async function generarCupos({ medicoId, salaId, fechaInicio, fechaFin, horarioIds }) {
  let creados = 0;
  let omitidos = 0;

  const start = new Date(fechaInicio + 'T00:00:00');
  const end = new Date(fechaFin + 'T00:00:00');

  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay(); // 0=Sun, 6=Sat
    if (dow >= 1 && dow <= 5) {
      const fechaStr = current.toISOString().slice(0, 10);
      for (const horarioId of horarioIds) {
        try {
          const result = await query(
            `INSERT INTO disponibilidad (id_medico, id_horario, id_sala, fecha, estado)
             VALUES ($1, $2, $3, $4, 'libre')
             ON CONFLICT DO NOTHING`,
            [medicoId, horarioId, salaId, fechaStr]
          );
          if (result.rowCount > 0) {
            creados++;
          } else {
            omitidos++;
          }
        } catch {
          omitidos++;
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return { creados, omitidos };
}

/**
 * Update estado of a disponibilidad record. Accepts a pg client for transaction support.
 */
async function setEstado(id, estado, client) {
  const executor = client || { query: (text, params) => query(text, params) };
  const { rows } = await executor.query(
    'UPDATE disponibilidad SET estado=$1 WHERE id_disponibilidad=$2 RETURNING *',
    [estado, id]
  );
  if (!rows.length) {
    const e = new Error('Cupo no encontrado');
    e.statusCode = 404;
    throw e;
  }
  return rows[0];
}

module.exports = {
  getAll,
  getById,
  create,
  delete: deleteDisponibilidad,
  generarCupos,
  setEstado,
};
