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
    horaInicio: data.horaInicio,
    horaFin: data.horaFin,
  };
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('horarios').get();
  return snap.docs.map(mapDoc);
}

async function getById(id) {
  const db = getDb();
  const snap = await db.collection('horarios').doc(id).get();
  if (!snap.exists) throw makeError('Horario no encontrado', 404);
  return mapDoc(snap);
}

async function create({ horaInicio, horaFin }) {
  if (timeToMinutes(horaFin) <= timeToMinutes(horaInicio)) {
    throw makeError('La hora de fin debe ser mayor a la hora de inicio', 400);
  }
  const db = getDb();
  const ref = await db.collection('horarios').add({ horaInicio, horaFin });
  const snap = await ref.get();
  return mapDoc(snap);
}

async function update(id, data) {
  const db = getDb();
  const docRef = db.collection('horarios').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Horario no encontrado', 404);
  const current = snap.data();
  const newInicio = data.horaInicio || current.horaInicio;
  const newFin = data.horaFin || current.horaFin;
  if (timeToMinutes(newFin) <= timeToMinutes(newInicio)) {
    throw makeError('La hora de fin debe ser mayor a la hora de inicio', 400);
  }
  await docRef.update(data);
  const updated = await docRef.get();
  return mapDoc(updated);
}

async function deleteHorario(id) {
  const db = getDb();
  const dispSnap = await db.collection('disponibilidad').where('horarioId', '==', id).limit(1).get();
  if (!dispSnap.empty) throw makeError('El horario tiene cupos asignados', 409);
  const docRef = db.collection('horarios').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Horario no encontrado', 404);
  await docRef.delete();
  return { deleted: true };
}

module.exports = { getAll, getById, create, update, delete: deleteHorario };
