const { getDb } = require('./firebase');

function makeError(msg, code) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

function mapDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    medicoId: data.medicoId,
    medicoNombre: data.medicoNombre,
    especialidad: data.especialidad,
    salaId: data.salaId,
    salaNombre: data.salaNombre,
    piso: data.piso,
    horarioId: data.horarioId,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
    fecha: data.fecha,
    estado: data.estado,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  let dbQuery = db.collection('disponibilidad');

  // Use at most one .where() to avoid composite index requirement
  // Prioritize fecha as it's the most selective filter
  let snap;
  if (filters.fecha) {
    snap = await dbQuery.where('fecha', '==', filters.fecha).get();
  } else {
    snap = await dbQuery.get();
  }

  let results = snap.docs.map(mapDoc);

  // Apply remaining filters in-memory
  if (filters.medicoId) results = results.filter(d => d.medicoId === filters.medicoId);
  if (filters.especialidad) results = results.filter(d => d.especialidad === filters.especialidad);
  if (filters.estado) results = results.filter(d => d.estado === filters.estado);
  // fecha already filtered above
  if (!filters.fecha && filters.fecha !== undefined) {
    // no-op: already handled
  }

  return results;
}

async function getById(id) {
  const db = getDb();
  const snap = await db.collection('disponibilidad').doc(id).get();
  if (!snap.exists) throw makeError('Cupo de disponibilidad no encontrado', 404);
  return mapDoc(snap);
}

async function create({ medicoId, horarioId, salaId, fecha, estado = 'libre' }) {
  const db = getDb();

  // Get medico, horario, sala for denormalization
  const medicoSnap = await db.collection('medicos').doc(medicoId).get();
  if (!medicoSnap.exists) throw makeError('Médico no encontrado', 404);
  const medico = medicoSnap.data();

  const horarioSnap = await db.collection('horarios').doc(horarioId).get();
  if (!horarioSnap.exists) throw makeError('Horario no encontrado', 404);
  const horario = horarioSnap.data();

  const salaSnap = await db.collection('salas').doc(salaId).get();
  if (!salaSnap.exists) throw makeError('Sala no encontrada', 404);
  const sala = salaSnap.data();

  // Check conflicts: get all disponibilidad for this medico, filter in-memory
  const medicoDispSnap = await db.collection('disponibilidad').where('medicoId', '==', medicoId).get();
  const existing = medicoDispSnap.docs.map(mapDoc);

  const medicoConflict = existing.find(d => d.fecha === fecha && d.horarioId === horarioId);
  if (medicoConflict) throw makeError('El médico ya tiene un cupo en ese horario y fecha', 409);

  // Check sala conflict in-memory (get all for this sala via getAll and filter)
  const salaDispSnap = await db.collection('disponibilidad').where('salaId', '==', salaId).get();
  const salaExisting = salaDispSnap.docs.map(mapDoc);
  const salaConflict = salaExisting.find(d => d.fecha === fecha && d.horarioId === horarioId);
  if (salaConflict) throw makeError('La sala ya tiene un cupo asignado en ese horario y fecha', 409);

  const docData = {
    medicoId,
    medicoNombre: medico.nombre,
    especialidad: medico.especialidad,
    salaId,
    salaNombre: sala.nombre,
    piso: sala.piso,
    horarioId,
    horaInicio: horario.horaInicio,
    horaFin: horario.horaFin,
    fecha,
    estado,
  };

  const ref = await db.collection('disponibilidad').add(docData);
  const snap2 = await ref.get();
  return mapDoc(snap2);
}

async function deleteDisponibilidad(id) {
  const db = getDb();
  const docRef = db.collection('disponibilidad').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Cupo de disponibilidad no encontrado', 404);
  const data = snap.data();
  if (data.estado !== 'libre') throw makeError('No se puede eliminar un cupo que no está libre', 409);

  // Check if there's an active reserva for this cupo
  const reservasSnap = await db.collection('reservas').where('disponibilidadId', '==', id).get();
  const activeReserva = reservasSnap.docs.find(r => r.data().estado !== 'cancelada');
  if (activeReserva) throw makeError('El cupo tiene una reserva activa', 409);

  await docRef.delete();
  return { deleted: true };
}

async function generarCupos({ medicoId, salaId, fechaInicio, fechaFin, horarioIds }) {
  const db = getDb();

  const medicoSnap = await db.collection('medicos').doc(medicoId).get();
  if (!medicoSnap.exists) throw makeError('Médico no encontrado', 404);
  const medico = medicoSnap.data();

  const salaSnap = await db.collection('salas').doc(salaId).get();
  if (!salaSnap.exists) throw makeError('Sala no encontrada', 404);
  const sala = salaSnap.data();

  // Load all horarios for the requested IDs
  const horariosData = {};
  for (const hId of horarioIds) {
    const hSnap = await db.collection('horarios').doc(hId).get();
    if (!hSnap.exists) throw makeError(`Horario ${hId} no encontrado`, 404);
    horariosData[hId] = hSnap.data();
  }

  // Get existing disponibilidad for this medico (all)
  const existingSnap = await db.collection('disponibilidad').where('medicoId', '==', medicoId).get();
  const existingList = existingSnap.docs.map(mapDoc);

  // Also get existing for sala to check sala conflicts
  const existingSalaSnap = await db.collection('disponibilidad').where('salaId', '==', salaId).get();
  const existingSalaList = existingSalaSnap.docs.map(mapDoc);

  let creados = 0;
  let omitidos = 0;

  // Loop dates
  const start = new Date(fechaInicio + 'T00:00:00');
  const end = new Date(fechaFin + 'T00:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fechaStr = `${yyyy}-${mm}-${dd}`;

    for (const horarioId of horarioIds) {
      const horario = horariosData[horarioId];

      // Check medico conflict
      const medicoConflict = existingList.find(e => e.fecha === fechaStr && e.horarioId === horarioId);
      if (medicoConflict) { omitidos++; continue; }

      // Check sala conflict
      const salaConflict = existingSalaList.find(e => e.fecha === fechaStr && e.horarioId === horarioId);
      if (salaConflict) { omitidos++; continue; }

      const docData = {
        medicoId,
        medicoNombre: medico.nombre,
        especialidad: medico.especialidad,
        salaId,
        salaNombre: sala.nombre,
        piso: sala.piso,
        horarioId,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        fecha: fechaStr,
        estado: 'libre',
      };

      const ref = await db.collection('disponibilidad').add(docData);
      // Add to in-memory lists to prevent same-batch conflicts
      const newEntry = { id: ref.id, ...docData };
      existingList.push(newEntry);
      existingSalaList.push(newEntry);
      creados++;
    }
  }

  return { creados, omitidos };
}

async function setEstado(id, estado, transaction) {
  const db = getDb();
  const docRef = db.collection('disponibilidad').doc(id);
  if (transaction) {
    transaction.update(docRef, { estado });
  } else {
    await docRef.update({ estado });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  delete: deleteDisponibilidad,
  generarCupos,
  setEstado,
};
