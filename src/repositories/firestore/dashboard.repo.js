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

  // citasPorEstado
  const citasPorEstado = {};
  for (const r of reservas) {
    citasPorEstado[r.estado] = (citasPorEstado[r.estado] || 0) + 1;
  }

  // cuposLibres: estado='libre' and fecha >= today
  const cuposLibres = disponibilidades.filter(d => d.estado === 'libre' && d.fecha >= todayStr).length;

  // proximasCitas: programadas sorted by fecha+horaInicio, top 5
  const programadas = reservas
    .filter(r => r.estado === 'programada' && r.fecha >= todayStr)
    .sort((a, b) => {
      const keyA = `${a.fecha}T${a.horaInicio}`;
      const keyB = `${b.fecha}T${b.horaInicio}`;
      return keyA.localeCompare(keyB);
    })
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      pacienteNombre: r.pacienteNombre,
      medicoNombre: r.medicoNombre,
      especialidad: r.especialidad,
      fecha: r.fecha,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      salaNombre: r.salaNombre,
    }));

  return {
    totalPacientes: pacientesSnap.size,
    totalMedicos: medicosSnap.size,
    totalReservas: reservas.length,
    cuposLibres,
    citasPorEstado: {
      programadas: citasPorEstado['programada'] || 0,
      atendidas: citasPorEstado['atendida'] || 0,
      canceladas: citasPorEstado['cancelada'] || 0,
    },
    proximasCitas: programadas,
  };
}

module.exports = { getStats };
