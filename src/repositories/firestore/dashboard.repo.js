const { getDb } = require('./firebase');

async function getStats() {
  const db = getDb();
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Fetch all collections in parallel
  const [reservasSnap, dispSnap, pacientesSnap, medicosSnap] = await Promise.all([
    db.collection('reservas').get(),
    db.collection('disponibilidad').get(),
    db.collection('pacientes').get(),
    db.collection('medicos').get(),
  ]);

  const reservas = reservasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const disponibilidades = dispSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Contadores por estado
  let citasHoy = 0;
  let programadas = 0;
  let atendidas = 0;
  let canceladas = 0;

  const estadoCounts = {};

  for (const r of reservas) {
    const estado = r.estado;
    if (estado) {
      estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
    }

    if (estado === 'programada') {
      programadas++;
      if (r.fecha === todayStr) {
        citasHoy++;
      }
    } else if (estado === 'atendida') {
      atendidas++;
    } else if (estado === 'cancelada') {
      canceladas++;
    }
  }

  // citasPorEstado formateado como array de objetos { estado, cantidad }
  const citasPorEstado = Object.keys(estadoCounts)
    .sort()
    .map(estado => ({
      estado,
      cantidad: estadoCounts[estado],
    }));

  // cuposLibres: estado='libre' and fecha >= today
  const cuposLibres = disponibilidades.filter(d => d.estado === 'libre' && d.fecha >= todayStr).length;

  // proximasCitas: programadas ordenadas por fecha + horaInicio (top 5)
  const proximasCitas = reservas
    .filter(r => r.estado === 'programada' && r.fecha >= todayStr)
    .sort((a, b) => {
      const keyA = `${a.fecha || ''}T${a.horaInicio || ''}`;
      const keyB = `${b.fecha || ''}T${b.horaInicio || ''}`;
      return keyA.localeCompare(keyB);
    })
    .slice(0, 5)
    .map(r => ({
      id: String(r.id),
      pacienteId: r.pacienteId ? String(r.pacienteId) : '',
      pacienteNombre: r.pacienteNombre || '',
      pacienteDocumento: r.pacienteDocumento || '',
      disponibilidadId: r.disponibilidadId ? String(r.disponibilidadId) : '',
      medicoNombre: r.medicoNombre || '',
      especialidad: r.especialidad || '',
      salaNombre: r.salaNombre || '',
      fecha: r.fecha || null,
      horaInicio: r.horaInicio || null,
      horaFin: r.horaFin || null,
      motivo: r.motivo || '',
      estado: r.estado || 'programada',
      creadaEn: r.creadaEn || null,
    }));

  return {
    citasHoy,
    programadas,
    atendidas,
    canceladas,
    cuposLibres,
    totalPacientes: pacientesSnap.size,
    totalMedicos: medicosSnap.size,
    proximasCitas,
    citasPorEstado,
  };
}

module.exports = { getStats };
