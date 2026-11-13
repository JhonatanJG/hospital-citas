const { getDb } = require('./firebase');

function makeError(msg, code) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

function mapReservaDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    pacienteId: data.pacienteId,
    pacienteNombre: data.pacienteNombre,
    pacienteDocumento: data.pacienteDocumento,
    disponibilidadId: data.disponibilidadId,
    medicoId: data.medicoId,
    medicoNombre: data.medicoNombre,
    especialidad: data.especialidad,
    salaNombre: data.salaNombre,
    fecha: data.fecha,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
    motivo: data.motivo,
    estado: data.estado,
    creadaEn: data.creadaEn,
  };
}

function mapPrescripcionDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    medicamentoId: data.medicamentoId,
    medicamentoNombre: data.medicamentoNombre,
    cantidad: data.cantidad,
    dosis: data.dosis,
    indicaciones: data.indicaciones,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('reservas').get();
  let results = snap.docs.map(mapReservaDoc);
  if (filters.estado) results = results.filter(r => r.estado === filters.estado);
  if (filters.fecha) results = results.filter(r => r.fecha === filters.fecha);
  if (filters.medicoId) results = results.filter(r => r.medicoId === filters.medicoId);
  if (filters.pacienteId) results = results.filter(r => r.pacienteId === filters.pacienteId);
  return results;
}

async function getById(id) {
  const db = getDb();
  const docRef = db.collection('reservas').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Reserva no encontrada', 404);
  const reserva = mapReservaDoc(snap);
  const prescSnap = await docRef.collection('prescripciones').get();
  reserva.prescripciones = prescSnap.docs.map(mapPrescripcionDoc);
  return reserva;
}

async function agendar({ pacienteId, disponibilidadId, motivo }) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const dispRef = db.collection('disponibilidad').doc(disponibilidadId);
    const dispSnap = await transaction.get(dispRef);
    if (!dispSnap.exists) throw makeError('Cupo de disponibilidad no encontrado', 404);
    const disp = dispSnap.data();
    if (disp.estado !== 'libre') throw makeError('El cupo no está disponible', 409);

    const pacienteRef = db.collection('pacientes').doc(pacienteId);
    const pacienteSnap = await transaction.get(pacienteRef);
    if (!pacienteSnap.exists) throw makeError('Paciente no encontrado', 404);
    const paciente = pacienteSnap.data();

    // Check for conflicting reserva for this paciente at same fecha+horaInicio
    // We need to query outside the transaction (Firestore limitation for reads before writes)
    const existingSnap = await db.collection('reservas').where('pacienteId', '==', pacienteId).get();
    const conflict = existingSnap.docs.find(r => {
      const d = r.data();
      return d.fecha === disp.fecha && d.horaInicio === disp.horaInicio && d.estado === 'programada';
    });
    if (conflict) throw makeError('El paciente ya tiene una cita programada en ese horario', 409);

    const newReservaRef = db.collection('reservas').doc();
    const creadaEn = new Date().toISOString();
    const reservaData = {
      pacienteId,
      pacienteNombre: paciente.nombre,
      pacienteDocumento: paciente.documento,
      disponibilidadId,
      medicoId: disp.medicoId,
      medicoNombre: disp.medicoNombre,
      especialidad: disp.especialidad,
      salaNombre: disp.salaNombre,
      fecha: disp.fecha,
      horaInicio: disp.horaInicio,
      horaFin: disp.horaFin,
      motivo: motivo || '',
      estado: 'programada',
      creadaEn,
    };

    transaction.set(newReservaRef, reservaData);
    transaction.update(dispRef, { estado: 'ocupada' });

    return { id: newReservaRef.id, ...reservaData, prescripciones: [] };
  });
}

async function cancelar(id) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const reservaRef = db.collection('reservas').doc(id);
    const reservaSnap = await transaction.get(reservaRef);
    if (!reservaSnap.exists) throw makeError('Reserva no encontrada', 404);
    const reserva = reservaSnap.data();
    if (reserva.estado !== 'programada') throw makeError('Solo se pueden cancelar reservas programadas', 400);

    const dispRef = db.collection('disponibilidad').doc(reserva.disponibilidadId);

    transaction.update(reservaRef, { estado: 'cancelada' });
    transaction.update(dispRef, { estado: 'libre' });

    return { id, ...reserva, estado: 'cancelada' };
  });
}

async function reprogramar(id, { nuevaDisponibilidadId }) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const reservaRef = db.collection('reservas').doc(id);
    const reservaSnap = await transaction.get(reservaRef);
    if (!reservaSnap.exists) throw makeError('Reserva no encontrada', 404);
    const reserva = reservaSnap.data();
    if (reserva.estado !== 'programada') throw makeError('Solo se pueden reprogramar reservas programadas', 400);

    const nuevaDispRef = db.collection('disponibilidad').doc(nuevaDisponibilidadId);
    const nuevaDispSnap = await transaction.get(nuevaDispRef);
    if (!nuevaDispSnap.exists) throw makeError('El nuevo cupo de disponibilidad no existe', 404);
    const nuevaDisp = nuevaDispSnap.data();
    if (nuevaDisp.estado !== 'libre') throw makeError('El nuevo cupo no está disponible', 409);

    const oldDispRef = db.collection('disponibilidad').doc(reserva.disponibilidadId);

    const updatedFields = {
      disponibilidadId: nuevaDisponibilidadId,
      medicoId: nuevaDisp.medicoId,
      medicoNombre: nuevaDisp.medicoNombre,
      especialidad: nuevaDisp.especialidad,
      salaNombre: nuevaDisp.salaNombre,
      fecha: nuevaDisp.fecha,
      horaInicio: nuevaDisp.horaInicio,
      horaFin: nuevaDisp.horaFin,
    };

    transaction.update(oldDispRef, { estado: 'libre' });
    transaction.update(nuevaDispRef, { estado: 'ocupada' });
    transaction.update(reservaRef, updatedFields);

    return { id, ...reserva, ...updatedFields };
  });
}

async function atender(id) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const reservaRef = db.collection('reservas').doc(id);
    const reservaSnap = await transaction.get(reservaRef);
    if (!reservaSnap.exists) throw makeError('Reserva no encontrada', 404);
    const reserva = reservaSnap.data();
    if (reserva.estado !== 'programada') throw makeError('Solo se pueden atender reservas programadas', 400);

    transaction.update(reservaRef, { estado: 'atendida' });

    return { id, ...reserva, estado: 'atendida' };
  });
}

async function getPrescripciones(reservaId) {
  const db = getDb();
  const reservaRef = db.collection('reservas').doc(reservaId);
  const reservaSnap = await reservaRef.get();
  if (!reservaSnap.exists) throw makeError('Reserva no encontrada', 404);
  const snap = await reservaRef.collection('prescripciones').get();
  return snap.docs.map(mapPrescripcionDoc);
}

async function addPrescripcion(reservaId, { medicamentoId, cantidad, dosis, indicaciones }) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const reservaRef = db.collection('reservas').doc(reservaId);
    const reservaSnap = await transaction.get(reservaRef);
    if (!reservaSnap.exists) throw makeError('Reserva no encontrada', 404);
    const reserva = reservaSnap.data();
    if (reserva.estado === 'cancelada') throw makeError('No se pueden agregar prescripciones a una reserva cancelada', 400);

    const medRef = db.collection('medicamentos').doc(medicamentoId);
    const medSnap = await transaction.get(medRef);
    if (!medSnap.exists) throw makeError('Medicamento no encontrado', 404);
    const med = medSnap.data();
    if (med.stock < cantidad) throw makeError('Stock insuficiente', 400);

    const prescripcionRef = reservaRef.collection('prescripciones').doc();
    const prescripcionData = {
      medicamentoId,
      medicamentoNombre: med.nombre,
      cantidad: Number(cantidad),
      dosis,
      indicaciones,
    };

    transaction.update(medRef, { stock: med.stock - Number(cantidad) });
    transaction.set(prescripcionRef, prescripcionData);

    return { id: prescripcionRef.id, ...prescripcionData };
  });
}

async function deletePrescripcion(reservaId, prescripcionId) {
  const db = getDb();

  return db.runTransaction(async (transaction) => {
    const reservaRef = db.collection('reservas').doc(reservaId);
    const prescripcionRef = reservaRef.collection('prescripciones').doc(prescripcionId);

    const prescSnap = await transaction.get(prescripcionRef);
    if (!prescSnap.exists) throw makeError('Prescripción no encontrada', 404);

    const presc = prescSnap.data();
    const medRef = db.collection('medicamentos').doc(presc.medicamentoId);
    const medSnap = await transaction.get(medRef);
    if (!medSnap.exists) throw makeError('Medicamento no encontrado', 404);
    const med = medSnap.data();

    transaction.update(medRef, { stock: med.stock + presc.cantidad });
    transaction.delete(prescripcionRef);

    return { deleted: true };
  });
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
