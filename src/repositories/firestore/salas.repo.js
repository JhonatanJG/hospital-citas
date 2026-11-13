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
    nombre: data.nombre,
    piso: data.piso,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('salas').get();
  return snap.docs.map(mapDoc);
}

async function getById(id) {
  const db = getDb();
  const snap = await db.collection('salas').doc(id).get();
  if (!snap.exists) throw makeError('Sala no encontrada', 404);
  return mapDoc(snap);
}

async function create({ nombre, piso }) {
  const db = getDb();
  const existing = await db.collection('salas').where('nombre', '==', nombre).limit(1).get();
  if (!existing.empty) throw makeError('Ya existe una sala con ese nombre', 409);
  const ref = await db.collection('salas').add({ nombre, piso });
  const snap = await ref.get();
  return mapDoc(snap);
}

async function update(id, data) {
  const db = getDb();
  const docRef = db.collection('salas').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Sala no encontrada', 404);
  await docRef.update(data);
  const updated = await docRef.get();
  return mapDoc(updated);
}

async function deleteSala(id) {
  const db = getDb();
  const dispSnap = await db.collection('disponibilidad').where('salaId', '==', id).limit(1).get();
  if (!dispSnap.empty) throw makeError('La sala tiene cupos asignados', 409);
  const docRef = db.collection('salas').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Sala no encontrada', 404);
  await docRef.delete();
  return { deleted: true };
}

module.exports = { getAll, getById, create, update, delete: deleteSala };
