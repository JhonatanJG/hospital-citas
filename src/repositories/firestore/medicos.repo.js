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
    documento: data.documento,
    nombre: data.nombre,
    especialidad: data.especialidad,
    telefono: data.telefono,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('medicos').get();
  let results = snap.docs.map(mapDoc);
  if (filters.especialidad) {
    results = results.filter(m => m.especialidad === filters.especialidad);
  }
  return results;
}

async function getById(id) {
  const db = getDb();
  const docRef = db.collection('medicos').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Médico no encontrado', 404);
  return mapDoc(snap);
}

async function create({ documento, nombre, especialidad, telefono }) {
  const db = getDb();
  const existing = await findByDocumento(documento);
  if (existing) throw makeError('Ya existe un médico con ese documento', 409);
  const ref = await db.collection('medicos').add({ documento, nombre, especialidad, telefono });
  const snap = await ref.get();
  return mapDoc(snap);
}

async function update(id, data) {
  const db = getDb();
  const docRef = db.collection('medicos').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Médico no encontrado', 404);
  await docRef.update(data);
  const updated = await docRef.get();
  return mapDoc(updated);
}

async function deleteMedico(id) {
  const db = getDb();
  const dispSnap = await db.collection('disponibilidad').where('medicoId', '==', id).limit(1).get();
  if (!dispSnap.empty) throw makeError('El médico tiene cupos asignados', 409);
  const docRef = db.collection('medicos').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Médico no encontrado', 404);
  await docRef.delete();
  return { deleted: true };
}

async function findByDocumento(documento) {
  const db = getDb();
  const snap = await db.collection('medicos').where('documento', '==', documento).limit(1).get();
  if (snap.empty) return null;
  return mapDoc(snap.docs[0]);
}

async function search(queryStr) {
  const all = await getAll();
  const q = queryStr.toLowerCase();
  return all.filter(m =>
    m.nombre.toLowerCase().includes(q) ||
    m.documento.toLowerCase().includes(q)
  );
}

module.exports = { getAll, getById, create, update, delete: deleteMedico, findByDocumento, search };
