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
    telefono: data.telefono,
    email: data.email,
    fechaNacimiento: data.fechaNacimiento,
  };
}

async function getAll(filters = {}) {
  const db = getDb();
  const snap = await db.collection('pacientes').get();
  let results = snap.docs.map(mapDoc);
  if (filters.nombre) {
    const q = filters.nombre.toLowerCase();
    results = results.filter(p => p.nombre.toLowerCase().includes(q));
  }
  if (filters.documento) {
    results = results.filter(p => p.documento === filters.documento);
  }
  return results;
}

async function getById(id) {
  const db = getDb();
  const snap = await db.collection('pacientes').doc(id).get();
  if (!snap.exists) throw makeError('Paciente no encontrado', 404);
  return mapDoc(snap);
}

async function create(data) {
  const db = getDb();
  const existing = await findByDocumento(data.documento);
  if (existing) throw makeError('Ya existe un paciente con ese documento', 409);
  const ref = await db.collection('pacientes').add({
    documento: data.documento,
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email,
    fechaNacimiento: data.fechaNacimiento,
  });
  const snap = await ref.get();
  return mapDoc(snap);
}

async function update(id, data) {
  const db = getDb();
  const docRef = db.collection('pacientes').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Paciente no encontrado', 404);
  await docRef.update(data);
  const updated = await docRef.get();
  return mapDoc(updated);
}

async function deletePaciente(id) {
  const db = getDb();
  const reservasSnap = await db.collection('reservas').where('pacienteId', '==', id).limit(1).get();
  if (!reservasSnap.empty) throw makeError('El paciente tiene citas registradas', 409);
  const docRef = db.collection('pacientes').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw makeError('Paciente no encontrado', 404);
  await docRef.delete();
  return { deleted: true };
}

async function findByDocumento(documento) {
  const db = getDb();
  const snap = await db.collection('pacientes').where('documento', '==', documento).limit(1).get();
  if (snap.empty) return null;
  return mapDoc(snap.docs[0]);
}

async function search(queryStr) {
  const all = await getAll();
  const q = queryStr.toLowerCase();
  return all.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.documento.toLowerCase().includes(q)
  );
}

module.exports = { getAll, getById, create, update, delete: deletePaciente, findByDocumento, search };
