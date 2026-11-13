const { query } = require('./db');

async function getStats() {
  // Run all count queries in parallel
  const [
    citasHoyResult,
    programadasResult,
    atendidasResult,
    canceladasResult,
    cuposLibresResult,
    totalPacientesResult,
    totalMedicosResult,
    proximasCitasResult,
    citasPorEstadoResult,
  ] = await Promise.all([
    // citasHoy: programadas para hoy
    query(
      `SELECT COUNT(*) AS count
       FROM reservas r
       JOIN disponibilidad d ON d.id_disponibilidad = r.id_disponibilidad
       WHERE d.fecha = CURRENT_DATE AND r.estado = 'programada'`
    ),
    // programadas: todas con estado='programada'
    query(`SELECT COUNT(*) AS count FROM reservas WHERE estado = 'programada'`),
    // atendidas
    query(`SELECT COUNT(*) AS count FROM reservas WHERE estado = 'atendida'`),
    // canceladas
    query(`SELECT COUNT(*) AS count FROM reservas WHERE estado = 'cancelada'`),
    // cuposLibres: disponibilidad libre con fecha >= hoy
    query(
      `SELECT COUNT(*) AS count
       FROM disponibilidad
       WHERE estado = 'libre' AND fecha >= CURRENT_DATE`
    ),
    // totalPacientes
    query(`SELECT COUNT(*) AS count FROM pacientes`),
    // totalMedicos
    query(`SELECT COUNT(*) AS count FROM medicos`),
    // proximasCitas: next 5 programadas
    query(
      `SELECT
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
       WHERE r.estado = 'programada' AND d.fecha >= CURRENT_DATE
       ORDER BY d.fecha ASC, h.hora_inicio ASC
       LIMIT 5`
    ),
    // citasPorEstado
    query(
      `SELECT estado, COUNT(*) AS cantidad
       FROM reservas
       GROUP BY estado
       ORDER BY estado ASC`
    ),
  ]);

  const toHHMM = (val) => (val ? String(val).slice(0, 5) : null);

  const proximasCitas = proximasCitasResult.rows.map((row) => ({
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
  }));

  const citasPorEstado = citasPorEstadoResult.rows.map((row) => ({
    estado: row.estado,
    cantidad: Number(row.cantidad),
  }));

  return {
    citasHoy: Number(citasHoyResult.rows[0].count),
    programadas: Number(programadasResult.rows[0].count),
    atendidas: Number(atendidasResult.rows[0].count),
    canceladas: Number(canceladasResult.rows[0].count),
    cuposLibres: Number(cuposLibresResult.rows[0].count),
    totalPacientes: Number(totalPacientesResult.rows[0].count),
    totalMedicos: Number(totalMedicosResult.rows[0].count),
    proximasCitas,
    citasPorEstado,
  };
}

module.exports = { getStats };
