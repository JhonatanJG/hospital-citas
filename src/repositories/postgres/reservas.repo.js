const { pool, query } = require('./db');

// ─── Helpers ────────────────────────────────────────────────────────────────

const RESERVA_JOIN_SQL = `
  SELECT
    r.id_reserva,
    r.id_paciente,
    p.nombre        AS paciente_nombre,
    p.documento     AS paciente_documento,
    r.id_disponibilidad,
    m.nombre        AS medico_nombre,
    m.especialidad,
    s.nombre        AS sala_nombre,
    d.fecha,
    h.hora_inicio,
    h.hora_fin,
    r.motivo,
    r.estado,
    r.creada_en
  FROM reservas r
  JOIN pacientes      p ON p.id_paciente      = r.id_paciente
  JOIN disponibilidad d ON d.id_disponibilidad = r.id_disponibilidad
  JOIN medicos        m ON m.id_medico         = d.id_medico
  JOIN salas          s ON s.id_sala           = d.id_sala
  JOIN horarios       h ON h.id_horario        = d.id_horario
`;

function mapReserva(row) {
  const toHHMM = (val) => (val ? String(val).slice(0, 5) : null);
  return {
    id: String(row.id_reserva),
    pacienteId: String(row.id_paciente),
    pacienteNombre: row.paciente_nombre,
    pacienteDocumento: row.paciente_documento,
    disponibilidadId: String(row.id_disponibilidad),
    medicoNombre: row.medico_nombre,
    especialidad: row.especialidad,
    salaNombre: row.sala_nombre,
    fecha: row.fecha ? row.fecha.toISOString().slice(0, 10) : null,
    horaInicio: toHHMM(row.hora_inicio),
    horaFin: toHHMM(row.hora_fin),
    motivo: row.motivo,
    estado: row.estado,
    creadaEn: row.creada_en ? row.creada_en.toISOString() : null,
  };
}

function mapPrescripcion(row) {
  return {
    id: String(row.id_prescripcion),
    medicamentoId: String(row.id_medicamento),
    medicamentoNombre: row.medicamento_nombre,
    cantidad: Number(row.cantidad),
    dosis: row.dosis,
    indicaciones: row.indicaciones,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

async function getAll(filters = {}) {
  const params = [];
  const conditions = [];

  if (filters.estado) {
    params.push(filters.estado);
    conditions.push(`r.estado = $${params.length}`);
  }
  if (filters.fecha) {
    params.push(filters.fecha);
    conditions.push(`d.fecha = $${params.length}`);
  }
  if (filters.medicoId) {
    params.push(filters.medicoId);
    conditions.push(`m.id_medico = $${params.length}`);
  }
  if (filters.pacienteId) {
    params.push(filters.pacienteId);
    conditions.push(`r.id_paciente = $${params.length}`);
  }

  let text = RESERVA_JOIN_SQL;
  if (conditions.length) {
    text += ' WHERE ' + conditions.join(' AND ');
  }
  text += ' ORDER BY d.fecha ASC, h.hora_inicio ASC';

  const { rows } = await query(text, params);
  return rows.map(mapReserva);
}

async function getById(id) {
  const { rows } = await query(RESERVA_JOIN_SQL + ' WHERE r.id_reserva = $1', [id]);
  if (!rows.length) {
    const e = new Error('Reserva no encontrada');
    e.statusCode = 404;
    throw e;
  }
  const reserva = mapReserva(rows[0]);

  // Fetch prescripciones
  const { rows: prescRows } = await query(
    `SELECT pr.*, med.nombre AS medicamento_nombre
     FROM prescripciones pr
     JOIN medicamentos med ON med.id_medicamento = pr.id_medicamento
     WHERE pr.id_reserva = $1
     ORDER BY pr.id_prescripcion ASC`,
    [id]
  );
  reserva.prescripciones = prescRows.map(mapPrescripcion);
  return reserva;
}

// ─── TRANSACTIONAL METHODS ────────────────────────────────────────────────────

async function agendar({ pacienteId, disponibilidadId, motivo }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock disponibilidad row
    const { rows: dispRows } = await client.query(
      'SELECT * FROM disponibilidad WHERE id_disponibilidad = $1 FOR UPDATE',
      [disponibilidadId]
    );
    if (!dispRows.length) {
      const e = new Error('Cupo no encontrado');
      e.statusCode = 404;
      throw e;
    }
    const disp = dispRows[0];

    // 2. Check estado
    if (disp.estado !== 'libre') {
      const e = new Error('El cupo ya fue reservado');
      e.statusCode = 409;
      throw e;
    }

    // 3. Check no active reserva for paciente at same fecha+horario
    const { rows: conflictRows } = await client.query(
      `SELECT 1 FROM reservas r
       JOIN disponibilidad d ON d.id_disponibilidad = r.id_disponibilidad
       WHERE r.id_paciente = $1
         AND d.fecha = $2
         AND d.id_horario = $3
         AND r.estado = 'programada'
       LIMIT 1`,
      [pacienteId, disp.fecha, disp.id_horario]
    );
    if (conflictRows.length) {
      const e = new Error('El paciente ya tiene una cita programada en ese horario');
      e.statusCode = 409;
      throw e;
    }

    // 4. INSERT reserva
    const { rows: newReserva } = await client.query(
      `INSERT INTO reservas (id_paciente, id_disponibilidad, motivo, estado)
       VALUES ($1, $2, $3, 'programada') RETURNING id_reserva`,
      [pacienteId, disponibilidadId, motivo]
    );

    // 4b. UPDATE disponibilidad estado='ocupada'
    await client.query(
      `UPDATE disponibilidad SET estado='ocupada' WHERE id_disponibilidad = $1`,
      [disponibilidadId]
    );

    await client.query('COMMIT');

    // 5. Return full reserva with join data
    return getById(String(newReserva[0].id_reserva));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cancelar(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock reserva
    const { rows } = await client.query(
      'SELECT * FROM reservas WHERE id_reserva = $1 FOR UPDATE',
      [id]
    );
    if (!rows.length) {
      const e = new Error('Reserva no encontrada');
      e.statusCode = 404;
      throw e;
    }
    const reserva = rows[0];

    // 2. Check estado
    if (reserva.estado !== 'programada') {
      const e = new Error('Solo se pueden cancelar citas programadas');
      e.statusCode = 400;
      throw e;
    }

    // 3. UPDATE reserva and disponibilidad
    await client.query(
      `UPDATE reservas SET estado='cancelada' WHERE id_reserva = $1`,
      [id]
    );
    await client.query(
      `UPDATE disponibilidad SET estado='libre' WHERE id_disponibilidad = $1`,
      [reserva.id_disponibilidad]
    );

    await client.query('COMMIT');
    return getById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function reprogramar(id, { nuevaDisponibilidadId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock current reserva
    const { rows: resRows } = await client.query(
      'SELECT * FROM reservas WHERE id_reserva = $1 FOR UPDATE',
      [id]
    );
    if (!resRows.length) {
      const e = new Error('Reserva no encontrada');
      e.statusCode = 404;
      throw e;
    }
    const reserva = resRows[0];
    if (reserva.estado !== 'programada') {
      const e = new Error('Solo se pueden reprogramar citas programadas');
      e.statusCode = 400;
      throw e;
    }

    // 2. Lock nueva disponibilidad
    const { rows: newDispRows } = await client.query(
      'SELECT * FROM disponibilidad WHERE id_disponibilidad = $1 FOR UPDATE',
      [nuevaDisponibilidadId]
    );
    if (!newDispRows.length) {
      const e = new Error('Nuevo cupo no encontrado');
      e.statusCode = 404;
      throw e;
    }
    if (newDispRows[0].estado !== 'libre') {
      const e = new Error('El nuevo cupo ya fue reservado');
      e.statusCode = 409;
      throw e;
    }

    // 3. Free old disponibilidad
    await client.query(
      `UPDATE disponibilidad SET estado='libre' WHERE id_disponibilidad = $1`,
      [reserva.id_disponibilidad]
    );

    // 4. Occupy nueva disponibilidad
    await client.query(
      `UPDATE disponibilidad SET estado='ocupada' WHERE id_disponibilidad = $1`,
      [nuevaDisponibilidadId]
    );

    // 5. Update reserva
    await client.query(
      `UPDATE reservas SET id_disponibilidad = $1 WHERE id_reserva = $2`,
      [nuevaDisponibilidadId, id]
    );

    await client.query('COMMIT');

    // 6. Return updated reserva
    return getById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function atender(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM reservas WHERE id_reserva = $1 FOR UPDATE',
      [id]
    );
    if (!rows.length) {
      const e = new Error('Reserva no encontrada');
      e.statusCode = 404;
      throw e;
    }
    if (rows[0].estado !== 'programada') {
      const e = new Error('Solo se pueden atender citas programadas');
      e.statusCode = 400;
      throw e;
    }

    await client.query(
      `UPDATE reservas SET estado='atendida' WHERE id_reserva = $1`,
      [id]
    );

    await client.query('COMMIT');
    return getById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── PRESCRIPCIONES ───────────────────────────────────────────────────────────

async function getPrescripciones(reservaId) {
  // Verify reserva exists
  const { rows: resRows } = await query(
    'SELECT 1 FROM reservas WHERE id_reserva = $1',
    [reservaId]
  );
  if (!resRows.length) {
    const e = new Error('Reserva no encontrada');
    e.statusCode = 404;
    throw e;
  }

  const { rows } = await query(
    `SELECT pr.*, med.nombre AS medicamento_nombre
     FROM prescripciones pr
     JOIN medicamentos med ON med.id_medicamento = pr.id_medicamento
     WHERE pr.id_reserva = $1
     ORDER BY pr.id_prescripcion ASC`,
    [reservaId]
  );
  return rows.map(mapPrescripcion);
}

async function addPrescripcion(reservaId, { medicamentoId, cantidad, dosis, indicaciones }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check reserva exists and not cancelled
    const { rows: resRows } = await client.query(
      'SELECT estado FROM reservas WHERE id_reserva = $1',
      [reservaId]
    );
    if (!resRows.length) {
      const e = new Error('Reserva no encontrada');
      e.statusCode = 404;
      throw e;
    }
    if (resRows[0].estado === 'cancelada') {
      const e = new Error('No se pueden agregar prescripciones a una cita cancelada');
      e.statusCode = 400;
      throw e;
    }

    // 2. Lock medicamento and check stock
    const { rows: medRows } = await client.query(
      'SELECT * FROM medicamentos WHERE id_medicamento = $1 FOR UPDATE',
      [medicamentoId]
    );
    if (!medRows.length) {
      const e = new Error('Medicamento no encontrado');
      e.statusCode = 404;
      throw e;
    }
    if (Number(medRows[0].stock) < Number(cantidad)) {
      const e = new Error('Stock insuficiente');
      e.statusCode = 400;
      throw e;
    }

    // 3. INSERT prescripcion
    const numCantidad = Number(cantidad);
    const { rows: prescRows } = await client.query(
      `INSERT INTO prescripciones (id_reserva, id_medicamento, cantidad, dosis, indicaciones)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [reservaId, medicamentoId, numCantidad, dosis, indicaciones]
    );

    // 3b. UPDATE stock
    await client.query(
      'UPDATE medicamentos SET stock = stock - CAST($1 AS INT) WHERE id_medicamento = $2',
      [numCantidad, medicamentoId]
    );

    await client.query('COMMIT');

    // 4. Return prescripcion with medicamentoNombre
    return mapPrescripcion({
      ...prescRows[0],
      medicamento_nombre: medRows[0].nombre,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deletePrescripcion(reservaId, prescripcionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get prescripcion and verify it belongs to reserva
    const { rows: prescRows } = await client.query(
      'SELECT * FROM prescripciones WHERE id_prescripcion = $1',
      [prescripcionId]
    );
    if (!prescRows.length) {
      const e = new Error('Prescripción no encontrada');
      e.statusCode = 404;
      throw e;
    }
    if (String(prescRows[0].id_reserva) !== String(reservaId)) {
      const e = new Error('La prescripción no pertenece a esta reserva');
      e.statusCode = 400;
      throw e;
    }

    const { cantidad, id_medicamento } = prescRows[0];

    // 2. Return stock
    await client.query(
      'UPDATE medicamentos SET stock = stock + CAST($1 AS INT) WHERE id_medicamento = $2',
      [Number(cantidad), id_medicamento]
    );

    // 3. DELETE prescripcion
    await client.query('DELETE FROM prescripciones WHERE id_prescripcion = $1', [prescripcionId]);

    await client.query('COMMIT');
    return { deleted: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getAll,
  getById,
  agendar,
  cancelar,
  reprogramar,
  atender,
  getPrescripciones,
  addPrescripcion,
  deletePrescripcion,
};
